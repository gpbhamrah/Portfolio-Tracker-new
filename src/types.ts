export interface Holding {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  qty: number;
  buyPrice: number;
  buyDate: string; // YYYY-MM-DD
  cmp: number;
  sellPrice: number;
  stopLoss: number;
  notes?: string;
  updatedAt?: string;
  dayChange?: number;
  dayChangePercent?: number;
}

export interface WatchlistItem {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  targetEntryPrice: number;
  cmp: number;
  addedDate: string; // YYYY-MM-DD
  targetSellPrice?: number;
  stopLoss?: number;
  notes?: string;
  dayChange?: number;
  dayChangePercent?: number;
}

export interface SectorIndex {
  name: string;
  ticker: string;
  category: string;
  value: number;
  change: number;
  changePercent: number;
  ema50: number;
  previousClose?: number;
  high52?: number;
  low52?: number;
  unavailable?: boolean;
}

export interface MarketBenchmark {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  ema20: number;
  ema50: number;
  ema200: number;
  lastUpdated?: string;
  unavailable?: boolean;
}

export interface MarketDataResponse {
  quotes: Record<string, {
    price: number;
    change: number;
    changePercent: number;
    previousClose: number;
    dayHigh?: number;
    dayLow?: number;
    volume?: number;
  }>;
  indices: {
    nifty: MarketBenchmark;
    sensex?: MarketBenchmark;
    sectors: SectorIndex[];
  };
  timestamp: number;
}
