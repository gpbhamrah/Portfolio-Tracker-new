import { MarketBenchmark, SectorIndex } from '../types';

export interface BatchQuotesResult {
  [ticker: string]: {
    price: number;
    change?: number;
    changePercent?: number;
    previousClose?: number;
    dayHigh?: number;
    dayLow?: number;
    name?: string;
  };
}

// In-memory cache to prevent duplicate rapid requests
let quotesCache: { data: BatchQuotesResult; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Standard EMA calculation helper
 */
export function calcEMA(prices: number[], period: number): number {
  if (!prices || prices.length === 0) return 0;
  const valid = prices.filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);
  if (valid.length < period) {
    if (valid.length === 0) return 0;
    const sum = valid.reduce((a, b) => a + b, 0);
    return Math.round((sum / valid.length) * 100) / 100;
  }
  const k = 2 / (period + 1);
  let ema = valid.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < valid.length; i++) {
    ema = valid[i] * k + ema * (1 - k);
  }
  return Math.round(ema * 100) / 100;
}

/**
 * Fetch quotes for multiple tickers in ONE fast batch request via server API.
 * Keeps market-data requests strictly server-side (no unreliable third-party CORS proxies).
 */
export async function fetchBatchQuotes(tickers: string[]): Promise<BatchQuotesResult> {
  const rawTickers = Array.from(new Set(tickers.filter(Boolean)));
  if (rawTickers.length === 0) return {};

  const now = Date.now();
  if (quotesCache && now - quotesCache.timestamp < CACHE_TTL_MS) {
    const allPresent = rawTickers.every((t) => quotesCache!.data[t.toUpperCase()] !== undefined);
    if (allPresent) {
      return quotesCache.data;
    }
  }

  try {
    const res = await fetch(
      `/api/market-data?symbols=${encodeURIComponent(rawTickers.join(','))}`,
      {
        headers: { Accept: 'application/json' },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.quotes && Object.keys(data.quotes).length > 0) {
        quotesCache = { data: data.quotes, timestamp: Date.now() };
        return data.quotes;
      }
    } else {
      console.warn(`Server endpoint /api/market-data returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to query server-side /api/market-data:', err);
  }

  return {};
}

/**
 * Fetch Benchmark (Nifty 50) and Sector Indices with genuine calculated EMAs.
 * Strictly uses server-side /api/indices-data.
 */
export async function fetchIndicesData(
  sectorList: SectorIndex[]
): Promise<{ nifty: MarketBenchmark | null; sectors: SectorIndex[]; isUnavailable?: boolean }> {
  try {
    const res = await fetch('/api/indices-data', {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.nifty || (data.sectors && data.sectors.length > 0)) {
        return {
          nifty: data.nifty,
          sectors: data.sectors || sectorList,
          isUnavailable: false,
        };
      }
    } else {
      console.warn(`Server endpoint /api/indices-data returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to query server-side /api/indices-data:', err);
  }

  // If server is unavailable, mark indices as unavailable rather than faking prices
  return {
    nifty: null,
    sectors: sectorList.map((s) => ({ ...s, unavailable: true })),
    isUnavailable: true,
  };
}
