import React from 'react';
import { SectorIndex } from '../types';
import { ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface SectorHealthTableProps {
  sectors: SectorIndex[];
}

export const SectorHealthTable: React.FC<SectorHealthTableProps> = ({ sectors }) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Sectoral Momentum & 50-EMA Diagnostics
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Gauge institutional sectoral rotation by measuring index price relation against the 50-day EMA
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/10">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
              <th className="p-3.5">Sector Index</th>
              <th className="p-3.5">Ticker</th>
              <th className="p-3.5 text-right">Current Value</th>
              <th className="p-3.5 text-right">Daily Change</th>
              <th className="p-3.5 text-right">50 EMA</th>
              <th className="p-3.5 text-center">Trend Structure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {sectors.map((sec) => {
              const isBullish = sec.value >= sec.ema50;
              const isPositive = sec.change >= 0;

              return (
                <tr
                  key={sec.ticker}
                  className="hover:bg-slate-800/50 transition duration-150 group"
                >
                  <td className="p-3.5 font-bold text-white tracking-tight">
                    {sec.name}
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono text-xs uppercase">
                    {sec.ticker}
                  </td>
                  <td className="p-3.5 text-right font-bold text-white font-mono">
                    {sec.value ? sec.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Loading...'}
                  </td>
                  <td className="p-3.5 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isPositive ? '+' : ''}
                      {sec.changePercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-3.5 text-right text-slate-300 font-mono">
                    {sec.ema50 ? sec.ema50.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '...'}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono border ${
                        isBullish
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950/80 text-rose-300 border-rose-800'
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

