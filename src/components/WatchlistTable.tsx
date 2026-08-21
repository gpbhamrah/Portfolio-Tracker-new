import React, { useState, useMemo } from 'react';
import { WatchlistItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Calendar, 
  TrendingDown,
  TrendingUp
} from 'lucide-react';

interface WatchlistTableProps {
  watchlist: WatchlistItem[];
  onEdit: (item: WatchlistItem) => void;
  onDelete: (id: string) => void;
  onMoveToHoldings: (item: WatchlistItem) => void;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({
  watchlist,
  onEdit,
  onDelete,
  onMoveToHoldings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWatchlist = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return watchlist;
    return watchlist.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.ticker.toLowerCase().includes(query) ||
        (item.sector && item.sector.toLowerCase().includes(query))
    );
  }, [watchlist, searchQuery]);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="watchlist-search-input"
            type="text"
            placeholder="Search watchlist symbols, sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
          />
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          TRACKING: <span className="font-bold text-indigo-400">{filteredWatchlist.length}</span> / {watchlist.length} OPPORTUNITIES
        </div>
      </div>

      {/* Table Container - Geometric Balance */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/10">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
              <th className="p-3.5">Stock</th>
              <th className="p-3.5 hidden md:table-cell">Sector</th>
              <th className="p-3.5 hidden lg:table-cell">Added Date</th>
              <th className="p-3.5 text-right">Target Entry</th>
              <th className="p-3.5 text-right">Current CMP</th>
              <th className="p-3.5 text-right">Distance to Entry</th>
              <th className="p-3.5 hidden lg:table-cell">Notes & Strategy</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredWatchlist.map((item) => {
              const diffPercent = item.targetEntryPrice
                ? ((item.cmp - item.targetEntryPrice) / item.targetEntryPrice) * 100
                : 0;
              const isNearEntry = Math.abs(diffPercent) <= 2;
              const isBelowEntry = item.cmp <= item.targetEntryPrice;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/50 transition duration-150 group"
                >
                  {/* Stock Name */}
                  <td className="p-3.5">
                    <div className="font-bold text-white tracking-tight">
                      {item.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold mt-0.5">
                      {item.ticker}
                    </div>
                  </td>

                  {/* Sector */}
                  <td className="p-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {item.sector || 'General'}
                    </span>
                  </td>

                  {/* Added Date */}
                  <td className="p-3.5 hidden lg:table-cell text-slate-400 font-mono">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{formatDate(item.addedDate)}</span>
                    </div>
                  </td>

                  {/* Target Entry */}
                  <td className="p-3.5 text-right font-mono text-indigo-400 font-bold">
                    {formatCurrency(item.targetEntryPrice)}
                  </td>

                  {/* CMP */}
                  <td className="p-3.5 text-right font-bold text-white font-mono">
                    {formatCurrency(item.cmp)}
                  </td>

                  {/* Distance */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 font-mono">
                      {isBelowEntry ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 animate-pulse">
                          <TrendingDown className="w-3 h-3" /> BUY ZONE ({Math.abs(diffPercent).toFixed(1)}% below)
                        </span>
                      ) : isNearEntry ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                          NEAR ENTRY ({diffPercent.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">
                          +{diffPercent.toFixed(1)}% above
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Notes */}
                  <td className="p-3.5 hidden lg:table-cell text-slate-400 max-w-xs truncate text-[11px] font-mono">
                    {item.notes || '—'}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onMoveToHoldings(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold font-mono bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-sm"
                        title="Purchase and transfer to Active Holdings"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>BUY</span>
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Edit watchlist item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${item.name} from watchlist?`)) {
                            onDelete(item.id);
                          }
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredWatchlist.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500 font-mono">
                  <div className="max-w-sm mx-auto space-y-2">
                    <p className="font-bold text-slate-300 uppercase tracking-wider">
                      WATCHLIST IS EMPTY
                    </p>
                    <p className="text-xs text-slate-500">
                      Add stocks you want to monitor for optimal dip entry prices.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
