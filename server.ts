import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for fast local responses
interface CacheItem<T> {
  data: T;
  timestamp: number;
}
const cache: { [key: string]: CacheItem<any> } = {};

function getCached<T>(key: string, ttlMs: number): T | null {
  const item = cache[key];
  if (!item) return null;
  if (Date.now() - item.timestamp > ttlMs) {
    delete cache[key];
    return null;
  }
  return item.data;
}

function setCached<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

/**
 * Standard technical analysis calculation of Exponential Moving Average (EMA).
 * Seeds with the SMA of the initial `period` elements, then iteratively applies
 * the smoothing factor k = 2 / (period + 1).
 */
export function calcRealEMA(prices: number[], period: number): number {
  if (!prices || prices.length === 0) return 0;
  const validPrices = prices.filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);
  if (validPrices.length < period) {
    if (validPrices.length === 0) return 0;
    const sum = validPrices.reduce((a, b) => a + b, 0);
    return Math.round((sum / validPrices.length) * 100) / 100;
  }

  const k = 2 / (period + 1);
  let ema = validPrices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < validPrices.length; i++) {
    ema = validPrices[i] * k + ema * (1 - k);
  }
  return Math.round(ema * 100) / 100;
}

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'investing-journal-server',
    time: new Date().toISOString(),
  });
});

// 2. Batch market data quotes endpoint
app.get('/api/market-data', async (req, res) => {
  try {
    const symbolsParam = (req.query.symbols as string) || '';
    const rawSymbols = symbolsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawSymbols.length === 0) {
      return res.json({ quotes: {}, timestamp: Date.now() });
    }

    // Expand symbols with exchange extensions
    const querySymbolsSet = new Set<string>();
    for (const s of rawSymbols) {
      querySymbolsSet.add(s);
      if (!s.includes('.') && !s.startsWith('^')) {
        querySymbolsSet.add(`${s}.NS`);
        querySymbolsSet.add(`${s}.BO`);
      }
    }
    const querySymbols = Array.from(querySymbolsSet);

    const cacheKey = `quotes_${querySymbols.sort().join('_')}`;
    const cached = getCached<any>(cacheKey, 15000);
    if (cached) {
      return res.json(cached);
    }

    const quotes: Record<string, any> = {};

    try {
      const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
        querySymbols.join(',')
      )}`;
      const response = await fetch(quoteUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data: any = await response.json();
        const results = data?.quoteResponse?.result || [];
        for (const item of results) {
          const sym = (item.symbol || '').toUpperCase();
          if (
            sym &&
            (item.regularMarketPrice !== undefined ||
              item.chartPreviousClose !== undefined ||
              item.previousClose !== undefined)
          ) {
            const qData = {
              price: item.regularMarketPrice ?? item.chartPreviousClose ?? item.previousClose ?? 0,
              change: item.regularMarketChange ?? 0,
              changePercent: item.regularMarketChangePercent ?? 0,
              previousClose: item.regularMarketPreviousClose ?? item.previousClose ?? 0,
              dayHigh: item.regularMarketDayHigh,
              dayLow: item.regularMarketDayLow,
              volume: item.regularMarketVolume,
              name: item.shortName || item.longName,
            };
            quotes[sym] = qData;

            if (sym.endsWith('.NS') || sym.endsWith('.BO')) {
              const base = sym.slice(0, -3);
              if (!quotes[base]) {
                quotes[base] = qData;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Batch quote error in server.ts:', e);
    }

    // Individual fallback for missing symbols
    const missing = querySymbols.filter((s) => !quotes[s.toUpperCase()]);
    if (missing.length > 0) {
      await Promise.allSettled(
        missing.map(async (sym) => {
          try {
            const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
              sym
            )}?interval=1d&range=5d`;
            const chartRes = await fetch(chartUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              },
            });
            if (chartRes.ok) {
              const chartData: any = await chartRes.json();
              const meta = chartData?.chart?.result?.[0]?.meta;
              if (meta) {
                const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
                const prev = meta.chartPreviousClose || price;
                const qData = {
                  price,
                  change: price - prev,
                  changePercent: prev ? ((price - prev) / prev) * 100 : 0,
                  previousClose: prev,
                  name: meta.shortName || meta.symbol,
                };
                quotes[sym.toUpperCase()] = qData;
                if (sym.toUpperCase().endsWith('.NS') || sym.toUpperCase().endsWith('.BO')) {
                  const base = sym.toUpperCase().slice(0, -3);
                  if (!quotes[base]) {
                    quotes[base] = qData;
                  }
                }
              }
            }
          } catch {
            // ignore
          }
        })
      );
    }

    const payload = { quotes, timestamp: Date.now() };
    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (error: any) {
    console.error('Error fetching market data:', error);
    return res.status(500).json({ error: error.message, quotes: {} });
  }
});

// 3. Benchmark indices and real EMA diagnostics endpoint
app.get('/api/indices-data', async (req, res) => {
  try {
    const cacheKey = 'indices_data_full';
    const cached = getCached<any>(cacheKey, 30000);
    if (cached) {
      return res.json(cached);
    }

    const sectorTickers = [
      { name: 'Nifty 50', ticker: '^NSEI', category: 'Benchmark' },
      { name: 'Bank Nifty', ticker: '^NSEBANK', category: 'Banking' },
      { name: 'Nifty IT', ticker: '^CNXIT', category: 'IT' },
      { name: 'Nifty Auto', ticker: '^CNXAUTO', category: 'Auto' },
      { name: 'Nifty FMCG', ticker: '^CNXFMCG', category: 'FMCG' },
      { name: 'Nifty Metal', ticker: '^CNXMETAL', category: 'Metals' },
      { name: 'Nifty Pharma', ticker: '^CNXPHARMA', category: 'Pharma' },
      { name: 'Nifty PSU Bank', ticker: '^CNXPSUBANK', category: 'PSU Bank' },
      { name: 'Nifty Fin Service', ticker: 'NIFTY_FIN_SERVICE.NS', category: 'Financial Services' },
      { name: 'Nifty Healthcare', ticker: '^CNXHEALTH', category: 'Healthcare' },
      { name: 'Nifty Oil & Gas', ticker: '^CNXOILGAS', category: 'Energy' },
      { name: 'Nifty Media', ticker: '^CNXMEDIA', category: 'Media' },
    ];

    // Benchmark Nifty 50 with 1y history for 20, 50, 200 EMA
    let niftyData = null;
    try {
      const niftyChartUrl =
        'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1y';
      const nRes = await fetch(niftyChartUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (nRes.ok) {
        const nJson: any = await nRes.json();
        const quotes: number[] = (
          nJson?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
        ).filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);

        if (quotes.length >= 2) {
          const currentVal = quotes[quotes.length - 1];
          const prevClose = quotes[quotes.length - 2];
          const chg = currentVal - prevClose;
          const chgPct = (chg / prevClose) * 100;

          niftyData = {
            symbol: '^NSEI',
            name: 'NIFTY 50',
            value: Math.round(currentVal * 100) / 100,
            change: Math.round(chg * 100) / 100,
            changePercent: Math.round(chgPct * 100) / 100,
            ema20: calcRealEMA(quotes, 20),
            ema50: calcRealEMA(quotes, 50),
            ema200: calcRealEMA(quotes, 200),
            lastUpdated: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            unavailable: false,
          };
        }
      }
    } catch (e) {
      console.warn('Real Nifty 50 history fetch failed:', e);
    }

    // Sector indices with 6mo history for real EMA 50
    const sectorPromises = sectorTickers.map(async (sec) => {
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          sec.ticker
        )}?interval=1d&range=6mo`;
        const res = await fetch(chartUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });

        if (res.ok) {
          const json: any = await res.json();
          const quotes: number[] = (
            json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
          ).filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);

          if (quotes.length >= 2) {
            const currentVal = quotes[quotes.length - 1];
            const prevClose = quotes[quotes.length - 2];
            const chg = currentVal - prevClose;
            const chgPct = (chg / prevClose) * 100;
            return {
              ...sec,
              value: Math.round(currentVal * 100) / 100,
              change: Math.round(chg * 100) / 100,
              changePercent: Math.round(chgPct * 100) / 100,
              ema50: calcRealEMA(quotes, 50),
              unavailable: false,
            };
          }
        }
      } catch (e) {
        // ignore
      }
      return {
        ...sec,
        value: 0,
        change: 0,
        changePercent: 0,
        ema50: 0,
        unavailable: true,
      };
    });

    const sectors = await Promise.all(sectorPromises);
    const payload = {
      nifty: niftyData,
      sectors,
      timestamp: Date.now(),
      status: niftyData ? 'success' : 'partial',
    };
    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, nifty: null, sectors: [] });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
