import { logger } from "../core/logger.js";
import { notify } from "../notify/telegram.js";

export class CircuitBreaker {
  private consecutiveLosses = 0;
  private triggered = false;
  private maxLosses: number;

  constructor(maxLosses: number) {
    this.maxLosses = maxLosses;
  }

  recordLoss(): void {
    this.consecutiveLosses++;
    logger.warn({ consecutiveLosses: this.consecutiveLosses, max: this.maxLosses }, "Loss recorded");
    if (this.consecutiveLosses >= this.maxLosses) {
      this.triggered = true;
      logger.error({ consecutiveLosses: this.consecutiveLosses }, "Circuit breaker triggered");
      notify.circuitBreaker(`${this.consecutiveLosses} consecutive losses hit the limit of ${this.maxLosses}`).catch(() => {});
    }
  }

  recordWin(): void {
    this.consecutiveLosses = 0;
  }

  isTriggered(): boolean {
    return this.triggered;
  }

  reset(): void {
    this.consecutiveLosses = 0;
    this.triggered = false;
    logger.info("Circuit breaker reset");
  }

  updateMax(maxLosses: number): void {
    this.maxLosses = maxLosses;
  }
}
