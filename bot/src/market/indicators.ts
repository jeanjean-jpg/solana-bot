/** Calculate Exponential Moving Average for a price series */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  // Seed with SMA of first `period` values
  const seed = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(seed);
  for (let i = period; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[ema.length - 1] * (1 - k));
  }
  return ema;
}

/** Calculate RSI for the last value in a price series */
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50; // neutral default
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => -c);
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Returns true when fast EMA just crossed above slow EMA (bullish) */
export function bullishCross(fastEMA: number[], slowEMA: number[]): boolean {
  if (fastEMA.length < 2 || slowEMA.length < 2) return false;
  const prevFast = fastEMA[fastEMA.length - 2];
  const currFast = fastEMA[fastEMA.length - 1];
  const prevSlow = slowEMA[slowEMA.length - 2];
  const currSlow = slowEMA[slowEMA.length - 1];
  return prevFast <= prevSlow && currFast > currSlow;
}

/** Returns true when fast EMA just crossed below slow EMA (bearish) */
export function bearishCross(fastEMA: number[], slowEMA: number[]): boolean {
  if (fastEMA.length < 2 || slowEMA.length < 2) return false;
  const prevFast = fastEMA[fastEMA.length - 2];
  const currFast = fastEMA[fastEMA.length - 1];
  const prevSlow = slowEMA[slowEMA.length - 2];
  const currSlow = slowEMA[slowEMA.length - 1];
  return prevFast >= prevSlow && currFast < currSlow;
}
