export interface Candle {
  date: string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Calculates authentic Exponential Moving Average (EMA) from actual historical close candles.
 * Formula: Multiplier = 2 / (period + 1)
 * EMA_today = (Close_today * Multiplier) + (EMA_yesterday * (1 - Multiplier))
 */
export function calculateRealEMA(prices: number[], period: number): number | null {
  if (!prices || prices.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);

  // Initial SMA as seed for EMA
  let initialSma = 0;
  for (let i = 0; i < period; i++) {
    initialSma += prices[i];
  }
  let currentEma = initialSma / period;

  // Process subsequent prices
  for (let i = period; i < prices.length; i++) {
    currentEma = prices[i] * multiplier + currentEma * (1 - multiplier);
  }

  return Math.round(currentEma * 100) / 100;
}

export const calcRealEMA = calculateRealEMA;

/**
 * Calculates multiple EMAs (20, 50, 100, 200) from historical close prices
 */
export function calculateAllEMAs(prices: number[]): {
  ema20: number | null;
  ema50: number | null;
  ema100: number | null;
  ema200: number | null;
} {
  return {
    ema20: calculateRealEMA(prices, 20),
    ema50: calculateRealEMA(prices, 50),
    ema100: calculateRealEMA(prices, 100),
    ema200: calculateRealEMA(prices, 200),
  };
}

/**
 * Calculates Wilder's 14-period RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period = 14): number | null {
  if (!prices || prices.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.round(rsi * 100) / 100;
}

/**
 * Calculates MACD (12, 26, 9) line and Signal line
 */
export function calculateMACD(
  prices: number[]
): { macdLine: number | null; signalLine: number | null; histogram: number | null } {
  if (!prices || prices.length < 35) {
    return { macdLine: null, signalLine: null, histogram: null };
  }

  const ema12Series: number[] = [];
  const mult12 = 2 / 13;
  let currentEma12 = prices.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  ema12Series.push(currentEma12);

  for (let i = 12; i < prices.length; i++) {
    currentEma12 = prices[i] * mult12 + currentEma12 * (1 - mult12);
    ema12Series.push(currentEma12);
  }

  const ema26Series: number[] = [];
  const mult26 = 2 / 27;
  let currentEma26 = prices.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
  ema26Series.push(currentEma26);

  for (let i = 26; i < prices.length; i++) {
    currentEma26 = prices[i] * mult26 + currentEma26 * (1 - mult26);
    ema26Series.push(currentEma26);
  }

  // MACD line = EMA12 - EMA26
  const macdValues: number[] = [];
  const offset = 26 - 12;
  for (let i = 0; i < ema26Series.length; i++) {
    const val12 = ema12Series[i + offset];
    const val26 = ema26Series[i];
    macdValues.push(val12 - val26);
  }

  const latestMacd = macdValues[macdValues.length - 1];
  const signal = calculateRealEMA(macdValues, 9);
  const histogram = signal !== null ? Math.round((latestMacd - signal) * 100) / 100 : null;

  return {
    macdLine: Math.round(latestMacd * 100) / 100,
    signalLine: signal,
    histogram,
  };
}
