import { supabase } from "../state/supabase.js";
import { logger } from "../core/logger.js";
import { CircuitBreaker } from "./circuitBreaker.js";

export interface RiskConfig {
  max_position_size_pct: number;   // % of wallet balance per trade
  max_open_positions: number;      // hard cap on concurrent positions
  daily_loss_limit_usd: number;    // pause all trading if exceeded
  circuit_breaker_losses: number;  // consecutive losses before halting
}

const DEFAULT_RISK_CONFIG: RiskConfig = {
  max_position_size_pct: 10,
  max_open_positions: 10,
  daily_loss_limit_usd: 100,
  circuit_breaker_losses: 5,
};

export class RiskManager {
  private config: RiskConfig = { ...DEFAULT_RISK_CONFIG };
  private circuitBreaker: CircuitBreaker;
  private dailyLossUsd = 0;
  private dailyLossDate = new Date().toDateString();
  private paused = false;

  constructor() {
    this.circuitBreaker = new CircuitBreaker(this.config.circuit_breaker_losses);
  }

  async loadConfig(): Promise<void> {
    const { data } = await supabase
      .from("bot_state")
      .select("risk_config")
      .eq("id", 1)
      .single();
    if (data?.risk_config) {
      this.config = { ...DEFAULT_RISK_CONFIG, ...(data.risk_config as Partial<RiskConfig>) };
      this.circuitBreaker.updateMax(this.config.circuit_breaker_losses);
      logger.info({ config: this.config }, "Risk config loaded");
    }
  }

  /** Call before every trade. Returns null if OK, error string if rejected. */
  async checkPreTrade(params: {
    tradeAmountUsd: number;
    walletBalanceUsd: number;
    strategyId: string;
  }): Promise<string | null> {
    // Reset daily loss counter if new day
    const today = new Date().toDateString();
    if (today !== this.dailyLossDate) {
      this.dailyLossUsd = 0;
      this.dailyLossDate = today;
      this.paused = false;
    }

    if (this.circuitBreaker.isTriggered()) {
      return "Circuit breaker triggered — trading paused. Reset from dashboard.";
    }

    if (this.paused) {
      return `Daily loss limit of $${this.config.daily_loss_limit_usd} reached — trading paused until tomorrow.`;
    }

    const maxSize = (params.walletBalanceUsd * this.config.max_position_size_pct) / 100;
    if (params.tradeAmountUsd > maxSize) {
      return `Trade size $${params.tradeAmountUsd.toFixed(2)} exceeds max position size $${maxSize.toFixed(2)} (${this.config.max_position_size_pct}% of wallet)`;
    }

    const { count } = await supabase
      .from("positions")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) >= this.config.max_open_positions) {
      return `Max open positions (${this.config.max_open_positions}) reached`;
    }

    return null;
  }

  recordTradeClosed(pnlUsd: number): void {
    if (pnlUsd < 0) {
      this.dailyLossUsd += Math.abs(pnlUsd);
      this.circuitBreaker.recordLoss();
      if (this.dailyLossUsd >= this.config.daily_loss_limit_usd) {
        this.paused = true;
        logger.warn({ dailyLossUsd: this.dailyLossUsd }, "Daily loss limit reached, pausing");
      }
    } else {
      this.circuitBreaker.recordWin();
    }
  }

  isPaused(): boolean {
    return this.paused || this.circuitBreaker.isTriggered();
  }

  getConfig(): RiskConfig {
    return this.config;
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    this.paused = false;
  }
}

// Singleton shared across all strategies
export const riskManager = new RiskManager();
