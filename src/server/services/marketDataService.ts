import { calculateAllEMAs, calculateRealEMA, calculateRSI } from './calculations';

export interface MarketQuote {
  symbol: string;
  name?: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  high52?: number;
  low52?: number;
  ema20?: number | null;
  ema50?: number | null;
  ema100?: number | null;
  ema200?: number | null;
  rsi14?: number | null;
  timestamp: string;
  status: 'fresh' | 'delayed' | 'stale' | 'unavailable';
  provider: string;
}

export interface HistoricalCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  type: string;
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>>;
  getHistoricalPrices(symbol: string, range?: string): Promise<HistoricalCandle[]>;
  getIndexData(): Promise<{ nifty: any; sectors: any[] }>;
  searchInstruments(query: string): Promise<InstrumentSearchResult[]>;
}

// In-Memory quote cache
interface CachedQuote {
  data: MarketQuote;
  cachedAt: number;
}

// In-Memory history cache
interface CachedHistory {
  data: HistoricalCandle[];
  cachedAt: number;
}

// In-Memory index cache
interface CachedIndexData {
  data: { nifty: any; sectors: any[] };
  cachedAt: number;
}

export class YahooMarketDataProvider implements MarketDataProvider {
  private quoteCache: Map<string, CachedQuote> = new Map();
  private historyCache: Map<string, CachedHistory> = new Map();
  private indexCache: CachedIndexData | null = null;
  private pendingRequests: Map<string, Promise<Record<string, MarketQuote>>> = new Map();
  private readonly QUOTE_TTL_MS = 20 * 1000; // 20 seconds TTL
  private readonly INDEX_TTL_MS = 30 * 1000; // 30 seconds TTL
  private readonly HISTORY_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

  private normalizeSymbol(sym: string): string {
    const clean = sym.trim().toUpperCase();
    if (clean.endsWith('.NS') || clean.endsWith('.BO') || clean.startsWith('^')) {
      return clean;
    }
    return `${clean}.NS`;
  }

  /**
   * Determine whether the National Stock Exchange (NSE) is currently open.
   * Standard regular hours: Monday-Friday, 09:15 to 15:30 IST (UTC+5:30).
   */
  private isNseMarketOpen(metaRegularPeriod?: { start?: number; end?: number }): boolean {
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

  public async getQuote(symbol: string): Promise<MarketQuote | null> {
    const quotes = await this.getBatchQuotes([symbol]);
    const norm = this.normalizeSymbol(symbol);
    return quotes[norm] || quotes[symbol.toUpperCase()] || Object.values(quotes)[0] || null;
  }

  public async getBatchQuotes(rawSymbols: string[]): Promise<Record<string, MarketQuote>> {
    if (!rawSymbols || rawSymbols.length === 0) return {};

    const symbols = Array.from(new Set(rawSymbols.map((s) => this.normalizeSymbol(s))));
    const results: Record<string, MarketQuote> = {};
    const now = Date.now();
    const missingSymbols: string[] = [];

    // 1. Check cache
    for (const sym of symbols) {
      const cached = this.quoteCache.get(sym);
      if (cached && now - cached.cachedAt < this.QUOTE_TTL_MS) {
        results[sym] = cached.data;
        results[sym.replace('.NS', '')] = cached.data;
      } else {
        missingSymbols.push(sym);
      }
    }

    if (missingSymbols.length === 0) {
      return results;
    }

    // 2. Deduplicate pending network requests
    const cacheKey = missingSymbols.sort().join(',');
    if (this.pendingRequests.has(cacheKey)) {
      const pendingRes = await this.pendingRequests.get(cacheKey)!;
      return { ...results, ...pendingRes };
    }

    const fetchPromise = this.executeBatchFetch(missingSymbols);
    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const fetched = await fetchPromise;
      for (const [sym, quote] of Object.entries(fetched)) {
        this.quoteCache.set(sym, { data: quote, cachedAt: Date.now() });
        results[sym] = quote;
        results[sym.replace('.NS', '')] = quote;
      }
    } finally {
      this.pendingRequests.delete(cacheKey);
    }

    return results;
  }

  private async executeBatchFetch(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const output: Record<string, MarketQuote> = {};
    const symList = symbols.join(',');

    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symList)}&formatted=false`;
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const json = await response.json();
        const items = json?.quoteResponse?.result || [];

        for (const item of items) {
          const sym = (item.symbol || '').toUpperCase();
          if (!sym) continue;

          const price = Number(item.regularMarketPrice ?? item.chartPreviousClose ?? item.previousClose ?? 0);
          const prevClose = Number(item.regularMarketPreviousClose ?? item.previousClose ?? item.chartPreviousClose ?? price);
          const change = Number(item.regularMarketChange ?? (price && prevClose ? price - prevClose : 0));
          const changePercent = Number(
            item.regularMarketChangePercent ?? (prevClose ? ((price - prevClose) / prevClose) * 100 : 0)
          );

          const quote: MarketQuote = {
            symbol: sym,
            name: item.shortName || item.longName || sym,
            price: Math.round(price * 100) / 100,
            previousClose: Math.round(prevClose * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            dayHigh: item.regularMarketDayHigh ? Math.round(Number(item.regularMarketDayHigh) * 100) / 100 : undefined,
            dayLow: item.regularMarketDayLow ? Math.round(Number(item.regularMarketDayLow) * 100) / 100 : undefined,
            volume: item.regularMarketVolume ? Number(item.regularMarketVolume) : undefined,
            high52: item.fiftyTwoWeekHigh ? Math.round(Number(item.fiftyTwoWeekHigh) * 100) / 100 : undefined,
            low52: item.fiftyTwoWeekLow ? Math.round(Number(item.fiftyTwoWeekLow) * 100) / 100 : undefined,
            timestamp: new Date().toISOString(),
            status: 'fresh',
            provider: 'Yahoo Finance Live Feed',
          };

          output[sym] = quote;
        }
      }
    } catch (err) {
      console.warn('Batch quote network query error:', err);
    }

    // Check missing symbols against v8 chart fallback
    const missing = symbols.filter((s) => !output[s]);
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
                const price = Number(meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0);
                const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
                const change = price - prev;
                const changePercent = prev ? (change / prev) * 100 : 0;

                const quote: MarketQuote = {
                  symbol: sym,
                  name: meta.shortName || meta.symbol || sym,
                  price: Math.round(price * 100) / 100,
                  previousClose: Math.round(prev * 100) / 100,
                  change: Math.round(change * 100) / 100,
                  changePercent: Math.round(changePercent * 100) / 100,
                  dayHigh: meta.regularMarketDayHigh ? Math.round(Number(meta.regularMarketDayHigh) * 100) / 100 : undefined,
                  dayLow: meta.regularMarketDayLow ? Math.round(Number(meta.regularMarketDayLow) * 100) / 100 : undefined,
                  timestamp: new Date().toISOString(),
                  status: 'delayed',
                  provider: 'Yahoo Finance Chart Feed',
                };
                output[sym] = quote;
              }
            }
          } catch {
            // ignore
          }
        })
      );
    }

    // For any remaining missing symbols: return cached if available, else mark unavailable (never fake price)
    for (const sym of symbols) {
      if (!output[sym]) {
        const cached = this.quoteCache.get(sym);
        if (cached) {
          output[sym] = { ...cached.data, status: 'stale' };
        } else {
          output[sym] = {
            symbol: sym,
            name: sym,
            price: 0,
            previousClose: 0,
            change: 0,
            changePercent: 0,
            timestamp: new Date().toISOString(),
            status: 'unavailable',
            provider: 'N/A',
          };
        }
      }
    }

    return output;
  }

  public async getHistoricalPrices(symbol: string, range = '1y'): Promise<HistoricalCandle[]> {
    const norm = this.normalizeSymbol(symbol);
    const cacheKey = `${norm}-${range}`;
    const cached = this.historyCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < this.HISTORY_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(norm)}?range=${range}&interval=1d`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        if (result && result.timestamp && result.indicators?.quote?.[0]) {
          const timestamps: number[] = result.timestamp;
          const q = result.indicators.quote[0];
          const candles: { timestamp: number; candle: HistoricalCandle }[] = [];

          for (let i = 0; i < timestamps.length; i++) {
            const closeVal = q.close?.[i];
            if (typeof closeVal === 'number' && !isNaN(closeVal) && closeVal > 0) {
              candles.push({
                timestamp: timestamps[i],
                candle: {
                  date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
                  open: Number(q.open?.[i] ?? closeVal),
                  high: Number(q.high?.[i] ?? closeVal),
                  low: Number(q.low?.[i] ?? closeVal),
                  close: Number(closeVal),
                  volume: Number(q.volume?.[i] || 0),
                },
              });
            }
          }

          // Sort chronologically ascending
          candles.sort((a, b) => a.timestamp - b.timestamp);
          const orderedCandles = candles.map((c) => c.candle);

          if (orderedCandles.length > 0) {
            this.historyCache.set(cacheKey, { data: orderedCandles, cachedAt: Date.now() });
            return orderedCandles;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch historical chart from Yahoo:', err);
    }

    // Do NOT generate random fake numbers. Return empty array on failure.
    return [];
  }

  /**
   * Retrieves authentic NIFTY 50 Benchmark & Sector Indices data with calculated EMAs.
   */
  public async getIndexData(): Promise<{ nifty: any; sectors: any[] }> {
    const now = Date.now();
    if (this.indexCache && now - this.indexCache.cachedAt < this.INDEX_TTL_MS) {
      return this.indexCache.data;
    }

    // 1. Fetch benchmark NIFTY 50 (^NSEI)
    let niftyResult: any = null;
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

        // Build valid, chronological close array
        const validCandles: { timestamp: number; close: number }[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = rawCloses[i];
          if (typeof c === 'number' && !isNaN(c) && c > 0) {
            validCandles.push({ timestamp: timestamps[i], close: c });
          }
        }
        validCandles.sort((a, b) => a.timestamp - b.timestamp);
        const validCloses = validCandles.map((v) => v.close);

        if (validCloses.length > 0 || meta?.regularMarketPrice) {
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

          const ema20 = calculateRealEMA(validCloses, 20) ?? 0;
          const ema50 = calculateRealEMA(validCloses, 50) ?? 0;
          const ema200 = calculateRealEMA(validCloses, 200) ?? 0;

          const isOpen = this.isNseMarketOpen(meta?.currentTradingPeriod?.regular);
          const marketStatus = latestValue > 0 ? (isOpen ? 'OPEN' : 'CLOSED') : 'UNAVAILABLE';

          const marketTime = meta?.regularMarketTime
            ? new Date(meta.regularMarketTime * 1000)
            : new Date();
          const lastUpdated = marketTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata',
          });

          niftyResult = {
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
            unavailable: latestValue <= 0,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to query live NIFTY 50 benchmark:', err);
    }

    if (!niftyResult) {
      niftyResult = {
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

    // 2. Fetch Sector Indices with 1y range for authentic 50 EMA
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

          if (validCloses.length >= 50) {
            const latestValue = Number(
              meta?.regularMarketPrice ?? validCloses[validCloses.length - 1]
            );

            const previousClose = Number(
              meta?.chartPreviousClose ??
                meta?.previousClose ??
                (validCloses.length >= 2 ? validCloses[validCloses.length - 2] : latestValue)
            );

            const ema50 = calculateRealEMA(validCloses, 50);

            if (latestValue > 0 && ema50 !== null && ema50 > 0) {
              const change = latestValue && previousClose ? Math.round((latestValue - previousClose) * 100) / 100 : 0;
              const changePercent =
                previousClose && previousClose > 0
                  ? Math.round(((latestValue - previousClose) / previousClose) * 10000) / 100
                  : 0;

              const distanceFromEma50 =
                Math.round(((latestValue - ema50) / ema50) * 10000) / 100;

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

              return {
                name: sec.name,
                ticker: sec.ticker,
                category: sec.category,
                value: Math.round(latestValue * 100) / 100,
                previousClose: Math.round(previousClose * 100) / 100,
                change,
                changePercent,
                ema50,
                distanceFromEma50,
                unavailable: false,
                lastUpdated,
              };
            }
          }
        }
      } catch (err) {
        console.warn(`Error fetching sector index ${sec.ticker}:`, err);
      }

      return {
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
    });

    const sectors = await Promise.all(sectorPromises);
    const finalData = { nifty: niftyResult, sectors };

    if (!niftyResult.unavailable) {
      this.indexCache = { data: finalData, cachedAt: Date.now() };
    }

    return finalData;
  }

  public async searchInstruments(query: string): Promise<InstrumentSearchResult[]> {
    if (!query || query.trim().length === 0) return [];

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        query
      )}&quotesCount=10&newsCount=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const quotes = json?.quotes || [];
        return quotes.map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange || 'NSE',
          sector: q.sector,
          type: q.quoteType || 'EQUITY',
        }));
      }
    } catch (err) {
      console.warn('Search query error:', err);
    }

    return [];
  }
}

export const marketDataService = new YahooMarketDataProvider();
