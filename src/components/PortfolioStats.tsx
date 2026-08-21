import React from 'react';
import { Holding, WatchlistItem } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  Calendar, 
  Layers 
} from 'lucide-react';

interface PortfolioStatsProps {
  holdings: Holding[];
  watchlist: WatchlistItem[];
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({ holdings, watchlist }) => {
  const totalInvested = holdings.reduce((sum, h) => sum + h.qty * h.buyPrice, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.qty * h.cmp, 0);
  const totalPL = totalCurrentValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  // Day P/L estimation
  const todayPL = holdings.reduce((sum, h) => {
    if (h.dayChange) {
      return sum + h.qty * h.dayChange;
    }
    return sum;
  }, 0);

  const stopLossCount = holdings.filter(h => h.stopLoss > 0 && h.cmp <= h.stopLoss).length;
  const targetReachedCount = holdings.filter(h => h.sellPrice > 0 && h.cmp >= h.sellPrice).length;

  // Holding duration breakdown
  const now = new Date().getTime();
  let ltcgCount = 0;
  let stcgCount = 0;

  holdings.forEach(h => {
    if (h.buyDate) {
      const days = Math.floor((now - new Date(h.buyDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 365) {
        ltcgCount++;
      } else {
        stcgCount++;
      }
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Invested */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md dark:shadow-black/10 flex flex-col justify-between transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              Total Capital Invested
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
              {formatCurrency(totalInvested)}
            </p>
          </div>
          <div className="w-8 h-8 rounded bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>{holdings.length} Positions Active</span>
          <span className="text-slate-400 dark:text-slate-500">{watchlist.length} Watchlist</span>
        </div>
      </div>

      {/* 2. Current Portfolio Value */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md dark:shadow-black/10 flex flex-col justify-between transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              Current Market Value
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
              {formatCurrency(totalCurrentValue)}
            </p>
          </div>
          <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider font-bold">Day's Net:</span>
          <span
            className={`font-semibold font-mono ${
              todayPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {todayPL >= 0 ? '+' : ''}{formatCurrency(todayPL)}
          </span>
        </div>
      </div>

      {/* 3. Total Unrealized P/L */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md dark:shadow-black/10 flex flex-col justify-between transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              Unrealized Returns (P/L)
            </p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <p
                className={`text-2xl font-bold font-mono ${
                  totalPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
              </p>
            </div>
          </div>
          <div
            className={`w-8 h-8 rounded border flex items-center justify-center ${
              totalPL >= 0
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
            }`}
          >
            {totalPL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <span
            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
              totalPL >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80'
            }`}
          >
            {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}% Overall
          </span>
          <span className="text-slate-400 dark:text-slate-500">Unrealized</span>
        </div>
      </div>

      {/* 4. Trigger Alerts & Holding Duration */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md dark:shadow-black/10 flex flex-col justify-between transition-colors">
        <div>
          <div className="flex justify-between items-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              Holding Term & Triggers
            </p>
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="flex items-center gap-2 mt-2 font-mono">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
              {ltcgCount} LTCG ({'>'}1y)
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
              {stcgCount} STCG ({'<'}1y)
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-xs font-mono">
          {targetReachedCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
              <Target className="w-3 h-3" /> {targetReachedCount} Target Hit
            </span>
          )}
          {stopLossCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-3 h-3" /> {stopLossCount} Stop Loss
            </span>
          )}
          {targetReachedCount === 0 && stopLossCount === 0 && (
            <span className="text-emerald-600 dark:text-emerald-400/90 text-xs flex items-center gap-1">
              ✓ All positions in safety zones
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

