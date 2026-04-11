import { describe, it, expect } from "vitest";
import { buildPositionInsert } from "../../src/state/positions.js";

describe("positions", () => {
  it("buildPositionInsert produces correct shape with all fields", () => {
    const result = buildPositionInsert({
      strategyId: "dca",
      walletId: "wallet-uuid-123",
      tokenMint: "So11111111111111111111111111111111111111112",
      tokenSymbol: "SOL",
      side: "spot",
      entryPrice: 150.50,
      amountUsd: 50,
      amountTokens: 0.3322,
      takeProfitPrice: 180,
    });
    expect(result.strategy_id).toBe("dca");
    expect(result.wallet_id).toBe("wallet-uuid-123");
    expect(result.side).toBe("spot");
    expect(result.entry_price).toBe(150.50);
    expect(result.take_profit_price).toBe(180);
    expect(result.stop_loss_price).toBeNull();
    expect(result.leverage).toBe(1);
    expect(result.tx_signature).toBeNull();
  });

  it("buildPositionInsert handles optional fields with defaults", () => {
    const result = buildPositionInsert({
      strategyId: "swing",
      walletId: "wallet-2",
      tokenMint: "mint-abc",
      side: "long",
      entryPrice: 200,
      amountUsd: 100,
      amountTokens: 0.5,
      stopLossPrice: 180,
      leverage: 3,
      txSignature: "abc123sig",
    });
    expect(result.stop_loss_price).toBe(180);
    expect(result.take_profit_price).toBeNull();
    expect(result.leverage).toBe(3);
    expect(result.tx_signature).toBe("abc123sig");
    expect(result.token_symbol).toBeNull();
  });
});
