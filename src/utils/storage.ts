import { Holding, WatchlistItem, SectorIndex } from '../types';
import { DEFAULT_HOLDINGS, DEFAULT_WATCHLIST } from '../data/defaultData';

const HOLDINGS_STORAGE_KEY = 'portfolio_holdings_v7';
const WATCHLIST_STORAGE_KEY = 'portfolio_watchlist_v7';
const THEME_STORAGE_KEY = 'portfolio_theme_mode';

export function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(HOLDINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_HOLDINGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure buyDate is preserved or defaulted
      return parsed.map((h: any) => ({
        ...h,
        buyDate: h.buyDate || h.date || new Date().toISOString().slice(0, 10),
      }));
    }
    return DEFAULT_HOLDINGS;
  } catch (err) {
    console.error('Failed to load holdings from storage', err);
    return DEFAULT_HOLDINGS;
  }
}

export function saveHoldings(holdings: Holding[]): void {
  try {
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
  } catch (err) {
    console.error('Failed to save holdings to storage', err);
  }
}

export function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((w: any) => ({
        ...w,
        addedDate: w.addedDate || w.date || new Date().toISOString().slice(0, 10),
      }));
    }
    return DEFAULT_WATCHLIST;
  } catch (err) {
    console.error('Failed to load watchlist from storage', err);
    return DEFAULT_WATCHLIST;
  }
}

export function saveWatchlist(watchlist: WatchlistItem[]): void {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  } catch (err) {
    console.error('Failed to save watchlist to storage', err);
  }
}

export function exportToCSV(holdings: Holding[]): void {
  let csv = 'Stock Name,Ticker,Sector,Quantity,Buy Price,Buy Date,Holding Period (Days),CMP,Current Value,Sell Target,Stop Loss,P/L (Rs),P/L (%),Status,Tax Category,Notes\n';
  
  const now = new Date();
  holdings.forEach(item => {
    const buyDate = item.buyDate || '';
    const daysHeld = buyDate ? Math.floor((now.getTime() - new Date(buyDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const curVal = item.qty * item.cmp;
    const pl = (item.cmp - item.buyPrice) * item.qty;
    const plPct = item.buyPrice ? ((item.cmp - item.buyPrice) / item.buyPrice) * 100 : 0;
    const status = item.cmp <= item.stopLoss ? 'Stop Loss Triggered' : item.cmp >= item.sellPrice ? 'Target Reached' : 'Active';
    const taxCat = daysHeld >= 365 ? 'LTCG' : 'STCG';
    
    csv += `"${item.name}","${item.ticker}","${item.sector || 'General'}",${item.qty},${item.buyPrice},"${buyDate}",${daysHeld},${item.cmp},${curVal.toFixed(2)},${item.sellPrice},${item.stopLoss},${pl.toFixed(2)},${plPct.toFixed(2)}%,"${status}","${taxCat}","${(item.notes || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `portfolio_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(holdings: Holding[], watchlist: WatchlistItem[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    holdings,
    watchlist,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
