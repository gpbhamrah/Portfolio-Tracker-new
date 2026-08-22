import React from 'react';
import { MarketBenchmark } from '../types';
import { TrendingUp, TrendingDown, Activity, ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';

interface BenchmarkBarProps {
  nifty: MarketBenchmark;
}

export const BenchmarkBar: React.FC<BenchmarkBarProps> = ({ nifty }) => {
  const isUnavailable = nifty.unavailable || !nifty.value || nifty.value <= 0;
  const isAbove20 = nifty.value >= nifty.ema20;
  const isAbove50 = nifty.value >= nifty.ema50;
  const isAbove200 = nifty.value >= nifty.ema200;
  const isPositive = nifty.change >= 0;

  if (isUnavailable) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm dark:shadow-lg dark:shadow-black/10 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase">
                {nifty.name} ({nifty.symbol})
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Market data is currently syncing or temporarily unavailable from upstream provider.
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
            STATUS: SYNC PENDING
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm dark:shadow-lg dark:shadow-black/10 transition-colors">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Left: Benchmark Index + Live CMP */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              <Activity className="w-3 h-3 text-indigo-500" />
              <span>Benchmark Index</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">{nifty.name}</p>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {nifty.symbol}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">Spot Quote</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
                {nifty.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span
                className={`text-xs font-semibold flex items-center gap-0.5 font-mono ${
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}
                {nifty.change.toFixed(2)} ({isPositive ? '+' : ''}
                {nifty.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden lg:block"></div>

          {/* EMA moving averages calculated from authentic daily closes */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">20 EMA (Short)</p>
              <p
                className={`text-xs sm:text-sm font-bold font-mono ${
                  isAbove20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {nifty.ema20 ? nifty.ema20.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '...'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">50 EMA (Medium)</p>
              <p
                className={`text-xs sm:text-sm font-bold font-mono ${
                  isAbove50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {nifty.ema50 ? nifty.ema50.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '...'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">200 EMA (Trend)</p>
              <p
                className={`text-xs sm:text-sm font-bold font-mono ${
                  isAbove200 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {nifty.ema200 ? nifty.ema200.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '...'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Market regime indicator */}
        <div className="flex items-center gap-2 self-start lg:self-center bg-slate-100 dark:bg-slate-800/90 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700/80">
          {isAbove50 ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <div className="text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">BULLISH STRUCTURE</span>
                <span className="text-slate-500 dark:text-slate-400 ml-1.5 text-[11px] font-mono">(Above 50 EMA)</span>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <div className="text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px]">CAUTION / BEARISH</span>
                <span className="text-slate-500 dark:text-slate-400 ml-1.5 text-[11px] font-mono">(Below 50 EMA)</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
