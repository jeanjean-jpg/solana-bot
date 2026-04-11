import { describe, it, expect } from "vitest";
import { buildSwapParams } from "../../src/execution/jupiter.js";
import { MINTS } from "../../src/config/constants.js";

describe("jupiter", () => {
  it("buildSwapParams returns correct structure for SOL→USDC", () => {
    const params = buildSwapParams({
      inputMint: MINTS.SOL,
      outputMint: MINTS.USDC,
      amountLamports: 1_000_000_000n,
      slippageBps: 50,
    });
    expect(params.inputMint).toBe(MINTS.SOL);
    expect(params.outputMint).toBe(MINTS.USDC);
    expect(params.amount).toBe("1000000000");
    expect(params.slippageBps).toBe(50);
    expect(params.onlyDirectRoutes).toBe(false);
  });

  it("uses default slippage when not specified", () => {
    const params = buildSwapParams({
      inputMint: MINTS.SOL,
      outputMint: MINTS.USDC,
      amountLamports: 500_000_000n,
    });
    expect(params.slippageBps).toBe(50); // DEFAULT_SLIPPAGE_BPS
  });
});
