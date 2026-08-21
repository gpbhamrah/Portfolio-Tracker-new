import React from 'react';
import { Holding } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { PieChart as PieChartIcon, PieChart as ChartIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PortfolioAnalyticsProps {
  holdings: Holding[];
}

const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#38bdf8', // sky
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // violet
  '#06b6d4', // cyan
];

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ holdings }) => {
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.qty * h.cmp, 0) || 1;

  // Stock allocation data
  const stockAllocationData = holdings.map((h) => ({
    name: h.name,
    value: Math.round(h.qty * h.cmp),
    ticker: h.ticker,
    percentage: ((h.qty * h.cmp) / totalCurrentValue) * 100,
  })).sort((a, b) => b.value - a.value);

  // Sector breakdown data
  const sectorMap: { [sector: string]: { name: string; value: number; invested: number; count: number } } = {};
  holdings.forEach((h) => {
    const sec = h.sector || 'General';
    if (!sectorMap[sec]) {
      sectorMap[sec] = { name: sec, value: 0, invested: 0, count: 0 };
    }
    sectorMap[sec].value += h.qty * h.cmp;
    sectorMap[sec].invested += h.qty * h.buyPrice;
    sectorMap[sec].count += 1;
  });

  const sectorSummary = Object.values(sectorMap)
    .map((s) => ({
      ...s,
      percentage: (s.value / totalCurrentValue) * 100,
      pl: s.value - s.invested,
    }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 text-white p-3 rounded border border-slate-700 text-xs space-y-1 font-mono shadow-xl">
          <p className="font-bold text-indigo-400">{data.name}</p>
          <p className="text-slate-300">Value: {formatCurrency(data.value)}</p>
          <p className="text-emerald-400 font-semibold">{data.percentage.toFixed(1)}% of portfolio</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Asset Allocation Chart */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-lg border border-slate-800 shadow-md shadow-black/10 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <PieChartIcon className="w-3.5 h-3.5 text-indigo-400" />
            Stock Asset Allocation
          </h3>
          <span className="text-[11px] font-mono text-slate-500">{holdings.length} STOCKS</span>
        </div>

        <div className="w-full h-60 relative flex items-center justify-center">
          {holdings.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockAllocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {stockAllocationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-slate-500 font-mono">No holdings to display</div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 max-h-28 overflow-y-auto pr-1">
          {stockAllocationData.map((item, idx) => (
            <div key={item.ticker} className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="truncate text-slate-400">{item.name}</span>
              <span className="font-bold text-white ml-auto">{item.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Sector Exposure & Risk Table */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-lg border border-slate-800 shadow-md shadow-black/10 lg:col-span-2 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mb-4">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <ChartIcon className="w-3.5 h-3.5 text-indigo-400" />
              Sector Exposure & Concentration Risk
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Risk guidelines recommend maintaining individual sector concentration below 30%
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {sectorSummary.length} SECTORS
          </span>
        </div>

        <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="p-3">Sector</th>
                <th className="p-3 text-right">Allocation %</th>
                <th className="p-3 text-right">Current Value</th>
                <th className="p-3 text-right">Sector Returns</th>
                <th className="p-3 text-center">Diversification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sectorSummary.map((sec, idx) => {
                const isOverweight = sec.percentage > 30;
                return (
                  <tr key={sec.name} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span>{sec.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono font-normal">
                          ({sec.count})
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 bg-slate-800 h-1.5 rounded overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded ${isOverweight ? 'bg-amber-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, sec.percentage)}%` }}
                          />
                        </div>
                        <span className="font-bold text-white font-mono">
                          {sec.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {formatCurrency(sec.value)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span
                        className={sec.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                      >
                        {sec.pl >= 0 ? '+' : ''}{formatCurrency(sec.pl)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {isOverweight ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                          <AlertCircle className="w-3 h-3" /> OVERWEIGHT ({'>'}30%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> BALANCED
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
    </div>
  );
};

