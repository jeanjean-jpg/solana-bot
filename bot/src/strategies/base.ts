export interface StrategyConfig {
  id: string;
  name: string;
  is_enabled: boolean;
  wallet_id: string | null;
  config: Record<string, unknown>;
  updated_at: string;
}

export abstract class BaseStrategy {
  abstract readonly name: string;
  protected running = false;

  abstract start(config: StrategyConfig): Promise<void>;
  abstract stop(): Promise<void>;
  abstract onConfigUpdate(config: StrategyConfig): Promise<void>;

  isRunning(): boolean {
    return this.running;
  }
}
