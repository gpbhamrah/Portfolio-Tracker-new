import React from 'react';
import { SectorIndex } from '../types';
import { ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

interface SectorHealthTableProps {
  sectors: SectorIndex[];
}

export const SectorHealthTable: React.FC<SectorHealthTableProps> = ({ sectors }) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Sectoral Momentum & 50-EMA Diagnostics
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Institutional sectoral rotation analysis with authentic 50-day EMA and session distance metrics
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-lg dark:shadow-black/10">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
              <th className="p-3.5">Sector Index</th>
              <th className="p-3.5">Ticker</th>
              <th className="p-3.5 text-right">Current Value</th>
              <th className="p-3.5 text-right">Daily Change</th>
              <th className="p-3.5 text-right">50 EMA</th>
              <th className="p-3.5 text-right">vs 50 EMA</th>
              <th className="p-3.5 text-center">Trend Structure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {sectors.map((sec) => {
              const isUnavailable = sec.unavailable || !sec.value || sec.value <= 0 || !sec.ema50 || sec.ema50 <= 0;
              const isBullish = !isUnavailable && sec.value >= sec.ema50;
              const isPositive = sec.change >= 0;

              // Calculate distance percentage: ((Current Value - EMA50) / EMA50) * 100
              const distance = sec.distanceFromEma50 !== undefined
                ? sec.distanceFromEma50
                : !isUnavailable && sec.ema50 > 0
                ? Math.round(((sec.value - sec.ema50) / sec.ema50) * 10000) / 100
                : null;

              const isDistancePositive = distance !== null && distance >= 0;

              return (
                <tr
                  key={sec.ticker}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-150 group"
                >
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white tracking-tight">
                    {sec.name}
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs uppercase">
                    {sec.ticker}
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                    {isUnavailable ? (
                      <span className="text-slate-400 dark:text-slate-500 font-normal">Data unavailable</span>
                    ) : (
                      sec.value.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {isUnavailable ? (
                      <span className="text-slate-400 dark:text-slate-500 font-mono">--</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isPositive ? '+' : ''}
                        {sec.changePercent.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right text-slate-700 dark:text-slate-200 font-mono font-medium">
                    {isUnavailable || !sec.ema50 ? (
                      <span className="text-slate-400 dark:text-slate-500 font-mono">--</span>
                    ) : (
                      sec.ema50.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    )}
                  </td>
                  <td className="p-3.5 text-right font-mono">
                    {isUnavailable || distance === null ? (
                      <span className="text-slate-400 dark:text-slate-500 font-mono">--</span>
                    ) : (
                      <span
                        className={`inline-flex items-center font-bold text-xs ${
                          isDistancePositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isDistancePositive ? '+' : ''}
                        {distance.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {isUnavailable ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Clock className="w-3 h-3" /> Data unavailable
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono border ${
                          isBullish
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {isBullish ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>BULLISH ({'>'} 50 EMA)</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>BEARISH ({'<'} 50 EMA)</span>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
