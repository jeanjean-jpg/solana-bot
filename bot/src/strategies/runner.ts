import { logger } from "../core/logger.js";
import { supabase } from "../state/supabase.js";
import type { BaseStrategy, StrategyConfig } from "./base.js";
import { DcaStrategy } from "./dca.js";
import { SwingStrategy } from "./swing.js";
import { ScalpingStrategy } from "./scalping.js";
import { SniperStrategy } from "./sniper.js";
import { CopyTradeStrategy } from "./copyTrade.js";
import { PerpsStrategy } from "./perps.js";

const STRATEGY_CLASSES: Record<string, new () => BaseStrategy> = {
  dca: DcaStrategy,
  swing: SwingStrategy,
  scalping: ScalpingStrategy,
  sniping: SniperStrategy,
  copy_trade: CopyTradeStrategy,
  perps: PerpsStrategy,
};

const RESTART_BACKOFF_MS = 10_000;

export class StrategyRunner {
  private instances = new Map<string, BaseStrategy>();
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  async start(): Promise<void> {
    logger.info("StrategyRunner starting...");
    const { data, error } = await supabase.from("strategies").select("*");
    if (error) throw new Error(`Failed to load strategies: ${error.message}`);

    for (const row of data ?? []) {
      if (row.is_enabled && row.wallet_id) {
        await this.startStrategy(row as StrategyConfig);
      }
    }

    this.subscribeToChanges();
    logger.info({ active: this.instances.size }, "StrategyRunner started");
  }

  async stop(): Promise<void> {
    logger.info("StrategyRunner stopping all strategies...");
    for (const [id, strategy] of this.instances) {
      await strategy.stop().catch(err => logger.warn(err, `Error stopping ${id}`));
    }
    this.instances.clear();

    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    logger.info("StrategyRunner stopped");
  }

  getActiveCount(): number {
    return this.instances.size;
  }

  private async startStrategy(config: StrategyConfig): Promise<void> {
    const Cls = STRATEGY_CLASSES[config.id];
    if (!Cls) {
      logger.warn({ id: config.id }, "Unknown strategy ID, skipping");
      return;
    }

    // Stop existing instance if running
    const existing = this.instances.get(config.id);
    if (existing) {
      await existing.stop().catch(() => {});
      this.instances.delete(config.id);
    }

    const instance = new Cls();
    try {
      await instance.start(config);
      this.instances.set(config.id, instance);
      logger.info({ id: config.id }, "Strategy started");
    } catch (err) {
      logger.error(err, `Strategy ${config.id} failed to start, retrying in ${RESTART_BACKOFF_MS}ms`);
      setTimeout(() => this.startStrategy(config), RESTART_BACKOFF_MS);
    }
  }

  private subscribeToChanges(): void {
    this.realtimeChannel = supabase
      .channel("strategy-runner-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "strategies" },
        async (payload) => {
          const config = payload.new as StrategyConfig;
          if (!config?.id) return;

          logger.info({ id: config.id, enabled: config.is_enabled }, "Strategy config changed");

          const existing = this.instances.get(config.id);

          if (!config.is_enabled) {
            if (existing) {
              await existing.stop().catch(err => logger.warn(err, `Stop error for ${config.id}`));
              this.instances.delete(config.id);
              logger.info({ id: config.id }, "Strategy stopped via realtime");
            }
          } else if (config.wallet_id) {
            if (existing) {
              await existing.onConfigUpdate(config).catch(err =>
                logger.warn(err, `Config update error for ${config.id}`)
              );
              logger.info({ id: config.id }, "Strategy config hot-reloaded");
            } else {
              await this.startStrategy(config);
            }
          }
        }
      )
      .subscribe();
  }
}
