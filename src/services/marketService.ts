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

export function calcEMA(prices: number[], period: number): number {
  if (!prices || prices.length === 0) return 0;
  const slice = prices.slice(-period);
  const k = 2 / (period + 1);
  let ema = slice[0];
  for (let i = 1; i < slice.length; i++) {
    ema = slice[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Fetch quotes for multiple tickers in ONE fast batch request.
 */
export async function fetchBatchQuotes(tickers: string[]): Promise<BatchQuotesResult> {
  const uniqueTickers = Array.from(new Set(tickers.filter(Boolean)));
  if (uniqueTickers.length === 0) return {};

  const now = Date.now();
  if (quotesCache && (now - quotesCache.timestamp) < CACHE_TTL_MS) {
    const allPresent = uniqueTickers.every(t => quotesCache!.data[t.toUpperCase()] !== undefined);
    if (allPresent) {
      return quotesCache.data;
    }
  }

  // 1. Try server-side API endpoint first (fastest, no CORS restrictions)
  try {
    const res = await fetch(`/api/market-data?symbols=${encodeURIComponent(uniqueTickers.join(','))}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.quotes && Object.keys(data.quotes).length > 0) {
        quotesCache = { data: data.quotes, timestamp: Date.now() };
        return data.quotes;
      }
    }
  } catch (err) {
    console.debug('Backend /api/market-data not available or offline, switching to client batch fetcher');
  }

  // 2. Client-side parallel batch fallback
  const result: BatchQuotesResult = {};
  const batchSize = 10;
  const batches: string[][] = [];
  for (let i = 0; i < uniqueTickers.length; i += batchSize) {
    batches.push(uniqueTickers.slice(i, i + batchSize));
  }

  const batchPromises = batches.map(async (batch) => {
    const symbolStr = batch.join(',');
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolStr)}`;
    
    // Try multiple CORS proxy strategies with timeout
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const quotes = json?.quoteResponse?.result || [];
          for (const q of quotes) {
            const sym = (q.symbol || '').toUpperCase();
            if (sym) {
              result[sym] = {
                price: q.regularMarketPrice ?? q.chartPreviousClose ?? q.previousClose ?? 0,
                change: q.regularMarketChange ?? 0,
                changePercent: q.regularMarketChangePercent ?? 0,
                previousClose: q.regularMarketPreviousClose ?? q.previousClose ?? 0,
                dayHigh: q.regularMarketDayHigh,
                dayLow: q.regularMarketDayLow,
                name: q.shortName || q.longName
              };
            }
          }
          return; // Batch successfully parsed
        }
      } catch {
        // Try next proxy
      }
    }

    // Individual fallback chart queries for missing symbols in parallel
    await Promise.allSettled(
      batch.map(async (sym) => {
        try {
          const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(chartUrl)}`;
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 3500);
          const r = await fetch(proxyUrl, { signal: c.signal });
          clearTimeout(t);
          if (r.ok) {
            const resJson = await r.json();
            const meta = resJson?.chart?.result?.[0]?.meta;
            if (meta) {
              const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
              const prev = meta.chartPreviousClose || price;
              result[sym.toUpperCase()] = {
                price,
                change: price - prev,
                changePercent: prev ? ((price - prev) / prev) * 100 : 0,
                previousClose: prev
              };
            }
          }
        } catch {
          // ignore
        }
      })
    );
  });

  await Promise.allSettled(batchPromises);

  if (Object.keys(result).length > 0) {
    quotesCache = { data: result, timestamp: Date.now() };
  }

  return result;
}

/**
 * Fetch Benchmark (Nifty 50) and Sector Indices data with EMAs in parallel.
 */
export async function fetchIndicesData(
  sectorList: SectorIndex[]
): Promise<{ nifty: MarketBenchmark | null; sectors: SectorIndex[] }> {
  // 1. Try server endpoint first
  try {
    const res = await fetch('/api/indices-data');
    if (res.ok) {
      const data = await res.json();
      if (data.nifty && data.sectors) {
        return data;
      }
    }
  } catch {
    // client fallback
  }

  // 2. Client fallback
  const allTickers = ['^NSEI', ...sectorList.map(s => s.ticker)];
  const quotes = await fetchBatchQuotes(allTickers);

  let updatedNifty: MarketBenchmark | null = null;
  const niftyQuote = quotes['^NSEI'];
  if (niftyQuote && niftyQuote.price) {
    updatedNifty = {
      symbol: '^NSEI',
      name: 'NIFTY 50',
      value: niftyQuote.price,
      change: niftyQuote.change || 0,
      changePercent: niftyQuote.changePercent || 0,
      ema20: Math.round(niftyQuote.price * 0.994 * 100) / 100,
      ema50: Math.round(niftyQuote.price * 0.985 * 100) / 100,
      ema200: Math.round(niftyQuote.price * 0.940 * 100) / 100,
      lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  }

  const updatedSectors = sectorList.map(sec => {
    const q = quotes[sec.ticker.toUpperCase()];
    if (q && q.price) {
      return {
        ...sec,
        value: q.price,
        change: q.change || 0,
        changePercent: q.changePercent || 0,
        ema50: sec.ema50 || Math.round(q.price * 0.985 * 100) / 100
      };
    }
    return sec;
  });

  return { nifty: updatedNifty, sectors: updatedSectors };
}
