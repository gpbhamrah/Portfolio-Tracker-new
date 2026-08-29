import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SectorIndexItem {
  name: string;
  ticker: string;
  category: string;
  value: number;
  previousClose: number;
  change: number;
  changePercent: number;
  ema50: number;
  distanceFromEma50?: number;
  unavailable: boolean;
  lastUpdated?: string;
}

/**
 * Calculates authentic Exponential Moving Average (EMA) from actual historical close prices.
 * - Multiplier: 2 / (period + 1)
 * - Initial Seed: SMA of first `period` valid closing prices
 * - Recurrence: EMA_today = (Close_today * Multiplier) + (EMA_yesterday * (1 - Multiplier))
 * - Full floating-point precision maintained throughout; rounded only for final representation.
 */
export function calcRealEMA(prices: number[], period: number): number | null {
  if (!prices || prices.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);

  // 1. Initial SMA over the first 'period' closes
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let ema = sum / period;

  // 2. Subsequent chronological sessions
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier);
  }

  return Math.round(ema * 100) / 100;
}

function isNseMarketOpen(metaRegularPeriod?: { start?: number; end?: number }): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  if (metaRegularPeriod?.start && metaRegularPeriod?.end) {
    if (nowSec >= metaRegularPeriod.start && nowSec <= metaRegularPeriod.end) {
      return true;
    }
  }

  try {
    const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    const day = istDate.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) return false;
    const totalMinutes = istDate.getHours() * 60 + istDate.getMinutes();
    return totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verified NSE Sector indices symbols
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
    { name: 'Nifty Realty', ticker: '^CNXREALTY', category: 'Realty' },
  ];

  try {
    // 1. Fetch benchmark NIFTY 50 (^NSEI) with 1y history for authentic 20, 50, 200 EMA
    let niftyData: any = null;
    try {
      const niftyChartUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1y';
      const nRes = await fetch(niftyChartUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      if (nRes.ok) {
        const nJson: any = await nRes.json();
        const result = nJson?.chart?.result?.[0];
        const meta = result?.meta;
        const timestamps: number[] = result?.timestamp || [];
        const rawCloses: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];

        // Pair, filter, deduplicate, and sort chronologically ascending
        const candleMap = new Map<number, number>();
        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i];
          const c = rawCloses[i];
          if (typeof c === 'number' && !isNaN(c) && c > 0 && typeof t === 'number') {
            candleMap.set(t, c);
          }
        }

        const sortedTimestamps = Array.from(candleMap.keys()).sort((a, b) => a - b);
        const validCloses = sortedTimestamps.map((t) => candleMap.get(t)!);

        if (validCloses.length >= 50 || meta?.regularMarketPrice) {
          const latestValue = Number(
            meta?.regularMarketPrice ??
              (validCloses.length > 0 ? validCloses[validCloses.length - 1] : 0)
          );

          const previousClose = Number(
            meta?.chartPreviousClose ??
              meta?.previousClose ??
              (validCloses.length >= 2 ? validCloses[validCloses.length - 2] : latestValue)
          );

          const change = latestValue && previousClose ? Math.round((latestValue - previousClose) * 100) / 100 : 0;
          const changePercent =
            previousClose && previousClose > 0
              ? Math.round(((latestValue - previousClose) / previousClose) * 10000) / 100
              : 0;

          const ema20 = calcRealEMA(validCloses, 20) ?? 0;
          const ema50 = calcRealEMA(validCloses, 50) ?? 0;
          const ema200 = calcRealEMA(validCloses, 200) ?? 0;

          const isOpen = isNseMarketOpen(meta?.currentTradingPeriod?.regular);
          const marketStatus = latestValue > 0 ? (isOpen ? 'OPEN' : 'CLOSED') : 'UNAVAILABLE';

          const marketTime = meta?.regularMarketTime
            ? new Date(meta.regularMarketTime * 1000)
            : sortedTimestamps.length > 0
            ? new Date(sortedTimestamps[sortedTimestamps.length - 1] * 1000)
            : new Date();

          const lastUpdated = marketTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata',
          });

          niftyData = {
            symbol: '^NSEI',
            name: 'NIFTY 50',
            value: Math.round(latestValue * 100) / 100,
            previousClose: Math.round(previousClose * 100) / 100,
            change,
            changePercent,
            ema20,
            ema50,
            ema200,
            lastUpdated,
            marketStatus,
            isDelayed: !isOpen,
            unavailable: latestValue <= 0 || ema50 <= 0,
          };
        }
      }
    } catch (e) {
      console.warn('Error querying NIFTY 50 chart:', e);
    }

    if (!niftyData) {
      niftyData = {
        symbol: '^NSEI',
        name: 'NIFTY 50',
        value: 0,
        previousClose: 0,
        change: 0,
        changePercent: 0,
        ema20: 0,
        ema50: 0,
        ema200: 0,
        lastUpdated: 'Unavailable',
        marketStatus: 'UNAVAILABLE',
        isDelayed: true,
        unavailable: true,
      };
    }

    // 2. Fetch Sector Indices with 1y history for stable 50 EMA
    const sectorPromises = sectorConfigs.map(async (sec) => {
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          sec.ticker
        )}?interval=1d&range=1y`;
        const res = await fetch(chartUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });

        if (res.ok) {
          const json: any = await res.json();
          const result = json?.chart?.result?.[0];
          const meta = result?.meta;
          const timestamps: number[] = result?.timestamp || [];
          const rawCloses: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];

          // Deduplicate, filter, and sort chronologically ascending
          const candleMap = new Map<number, number>();
          for (let i = 0; i < timestamps.length; i++) {
            const t = timestamps[i];
            const c = rawCloses[i];
            if (typeof c === 'number' && !isNaN(c) && c > 0 && typeof t === 'number') {
              candleMap.set(t, c);
            }
          }

          const sortedTimestamps = Array.from(candleMap.keys()).sort((a, b) => a - b);
          const validCloses = sortedTimestamps.map((t) => candleMap.get(t)!);

          // Validation: require at least 50 valid trading closes for authentic 50 EMA
          if (validCloses.length >= 50) {
            const latestValue = Number(
              meta?.regularMarketPrice ?? validCloses[validCloses.length - 1]
            );

            const previousClose = Number(
              meta?.chartPreviousClose ??
                meta?.previousClose ??
                (validCloses.length >= 2 ? validCloses[validCloses.length - 2] : latestValue)
            );

            const calculatedEma50 = calcRealEMA(validCloses, 50);

            if (latestValue > 0 && calculatedEma50 !== null && calculatedEma50 > 0) {
              const change = latestValue && previousClose ? Math.round((latestValue - previousClose) * 100) / 100 : 0;
              const changePercent =
                previousClose && previousClose > 0
                  ? Math.round(((latestValue - previousClose) / previousClose) * 10000) / 100
                  : 0;

              // Calculate % distance from 50 EMA: ((Current - EMA50) / EMA50) * 100
              const distanceFromEma50 =
                Math.round(((latestValue - calculatedEma50) / calculatedEma50) * 10000) / 100;

              const candleTime = meta?.regularMarketTime
                ? new Date(meta.regularMarketTime * 1000)
                : sortedTimestamps.length > 0
                ? new Date(sortedTimestamps[sortedTimestamps.length - 1] * 1000)
                : new Date();

              const lastUpdated = candleTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Kolkata',
              });

              const item: SectorIndexItem = {
                name: sec.name,
                ticker: sec.ticker,
                category: sec.category,
                value: Math.round(latestValue * 100) / 100,
                previousClose: Math.round(previousClose * 100) / 100,
                change,
                changePercent,
                ema50: calculatedEma50,
                distanceFromEma50,
                unavailable: false,
                lastUpdated,
              };
              return item;
            }
          }
        }
      } catch (err) {
        console.warn(`Error fetching sector index ${sec.ticker}:`, err);
      }

      const fallbackItem: SectorIndexItem = {
        name: sec.name,
        ticker: sec.ticker,
        category: sec.category,
        value: 0,
        previousClose: 0,
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
      status: niftyData.unavailable ? 'partial' : 'success',
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
