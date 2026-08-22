import type { VercelRequest, VercelResponse } from '@vercel/node';

interface QuoteData {
  price: number;
  change?: number;
  changePercent?: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  name?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS and Cache-Control headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=45');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const symbolsParam = (req.query.symbols as string) || '';
    const rawSymbols = symbolsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawSymbols.length === 0) {
      return res.status(200).json({ quotes: {}, timestamp: Date.now() });
    }

    // Expand symbols (e.g. 'RELIANCE' -> 'RELIANCE', 'RELIANCE.NS', 'RELIANCE.BO')
    const querySymbolsSet = new Set<string>();
    for (const s of rawSymbols) {
      querySymbolsSet.add(s);
      if (!s.includes('.') && !s.startsWith('^')) {
        querySymbolsSet.add(`${s}.NS`);
        querySymbolsSet.add(`${s}.BO`);
      }
    }
    const querySymbols = Array.from(querySymbolsSet);

    const quotes: Record<string, QuoteData> = {};

    // 1. Batch quote endpoint
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
            const qData: QuoteData = {
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

            // Also map base ticker
            if (sym.endsWith('.NS') || sym.endsWith('.BO')) {
              const base = sym.slice(0, -3);
              if (!quotes[base]) {
                quotes[base] = qData;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Batch quote endpoint failed:', err);
    }

    // 2. Individual fallback for missing symbols via v8 chart endpoint
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
                const qData: QuoteData = {
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
            // ignore individual symbol errors
          }
        })
      );
    }

    return res.status(200).json({ quotes, timestamp: Date.now() });
  } catch (error: any) {
    console.error('Error in /api/market-data:', error);
    return res.status(500).json({
      error: 'Failed to fetch market data from upstream provider',
      details: error.message || String(error),
      quotes: {},
    });
  }
}
