import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SectorIndexItem {
  name: string;
  ticker: string;
  category: string;
  value: number;
  change: number;
  changePercent: number;
  ema50: number;
  unavailable?: boolean;
}

export function calcRealEMA(prices: number[], period: number): number {
  if (!prices || prices.length === 0) return 0;
  
  // Filter out any null or invalid numbers
  const validPrices = prices.filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);
  if (validPrices.length < period) {
    if (validPrices.length === 0) return 0;
    // If fewer data points than period, calculate mean of available points
    const sum = validPrices.reduce((a, b) => a + b, 0);
    return Math.round((sum / validPrices.length) * 100) / 100;
  }

  const k = 2 / (period + 1);
  // Initial seed: SMA of first 'period' values
  let ema = validPrices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Apply EMA recursively across the remaining historical prices
  for (let i = period; i < validPrices.length; i++) {
    ema = validPrices[i] * k + ema * (1 - k);
  }

  return Math.round(ema * 100) / 100;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sectorConfigs = [
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

  try {
    // 1. Fetch benchmark NIFTY 50 with 1 year daily history for 20, 50, 200 EMA
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
      console.warn('Error querying NIFTY 50 chart:', e);
    }

    // 2. Fetch all Sector Indices in parallel using 6mo historical chart
    const sectorPromises = sectorConfigs.map(async (sec) => {
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

            const item: SectorIndexItem = {
              ...sec,
              value: Math.round(currentVal * 100) / 100,
              change: Math.round(chg * 100) / 100,
              changePercent: Math.round(chgPct * 100) / 100,
              ema50: calcRealEMA(quotes, 50),
              unavailable: false,
            };
            return item;
          }
        }
      } catch (err) {
        console.warn(`Error fetching sector index ${sec.ticker}:`, err);
      }

      // If data is unavailable, explicitly set unavailable flag and 0 value
      const fallbackItem: SectorIndexItem = {
        ...sec,
        value: 0,
        change: 0,
        changePercent: 0,
        ema50: 0,
        unavailable: true,
      };
      return fallbackItem;
    });

    const sectors = await Promise.all(sectorPromises);

    return res.status(200).json({
      nifty: niftyData,
      sectors,
      timestamp: Date.now(),
      status: niftyData ? 'success' : 'partial',
    });
  } catch (error: any) {
    console.error('Error in /api/indices-data:', error);
    return res.status(500).json({
      error: 'Failed to fetch indices data from market provider',
      details: error.message || String(error),
      nifty: null,
      sectors: [],
    });
  }
}
