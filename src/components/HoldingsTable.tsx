import React, { useState, useMemo } from 'react';
import { Holding } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatHoldingDuration, 
  getTaxCategory 
} from '../utils/formatters';
import { CalendarPicker } from './CalendarPicker';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  Target, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Search,
  CheckCircle2
} from 'lucide-react';

interface HoldingsTableProps {
  holdings: Holding[];
  onEdit: (holding: Holding) => void;
  onDelete: (id: string) => void;
  onUpdateBuyDate: (id: string, newDate: string) => void;
}

type SortField = 'name' | 'sector' | 'qty' | 'buyPrice' | 'buyDate' | 'cmp' | 'value' | 'pl';

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  onEdit,
  onDelete,
  onUpdateBuyDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedHoldings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = holdings.filter(item => {
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.ticker.toLowerCase().includes(query) ||
        (item.sector && item.sector.toLowerCase().includes(query)) ||
        (item.buyDate && item.buyDate.includes(query))
      );
    });

    return filtered.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'sector':
          valA = (a.sector || '').toLowerCase();
          valB = (b.sector || '').toLowerCase();
          break;
        case 'qty':
          valA = a.qty;
          valB = b.qty;
          break;
        case 'buyPrice':
          valA = a.buyPrice;
          valB = b.buyPrice;
          break;
        case 'buyDate':
          valA = new Date(a.buyDate || '1970-01-01').getTime();
          valB = new Date(b.buyDate || '1970-01-01').getTime();
          break;
        case 'cmp':
          valA = a.cmp;
          valB = b.cmp;
          break;
        case 'value':
          valA = a.qty * a.cmp;
          valB = b.qty * b.cmp;
          break;
        case 'pl':
          valA = (a.cmp - a.buyPrice) * a.qty;
          valB = (b.cmp - b.buyPrice) * b.qty;
          break;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [holdings, searchQuery, sortField, sortAsc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-indigo-500" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-500" />
    );
  };

  const startEditDate = (holding: Holding) => {
    setEditingDateId(holding.id);
    setTempDate(holding.buyDate || new Date().toISOString().slice(0, 10));
  };

  const saveDate = (id: string, dateToSave?: string) => {
    const finalDate = dateToSave || tempDate;
    if (finalDate) {
      onUpdateBuyDate(id, finalDate);
    }
    setEditingDateId(null);
  };

  return (
    <div className="space-y-3">
      {/* Search & Counter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="holdings-search-input"
            type="text"
            placeholder="Search stock, ticker, sector, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          FILTERED: <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredAndSortedHoldings.length}</span> / {holdings.length} POSITIONS
        </div>
      </div>

      {/* Table Container - Geometric Balance */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-lg dark:shadow-black/10">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
              <th
                onClick={() => handleSort('name')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Stock</span>
                  {renderSortIcon('name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('sector')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group hidden md:table-cell"
              >
                <div className="flex items-center gap-1.5">
                  <span>Sector</span>
                  {renderSortIcon('sector')}
                </div>
              </th>
              <th
                onClick={() => handleSort('buyDate')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
                title="Purchase date & holding duration (tracks STCG vs LTCG)"
              >
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-3 h-3" />
                  <span>Buy Date / Duration</span>
                  {renderSortIcon('buyDate')}
                </div>
              </th>
              <th
                onClick={() => handleSort('qty')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Qty</span>
                  {renderSortIcon('qty')}
                </div>
              </th>
              <th
                onClick={() => handleSort('buyPrice')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Avg Buy</span>
                  {renderSortIcon('buyPrice')}
                </div>
              </th>
              <th
                onClick={() => handleSort('cmp')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>CMP</span>
                  {renderSortIcon('cmp')}
                </div>
              </th>
              <th
                onClick={() => handleSort('value')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Position Value</span>
                  {renderSortIcon('value')}
                </div>
              </th>
              <th
                onClick={() => handleSort('pl')}
                className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total P/L</span>
                  {renderSortIcon('pl')}
                </div>
              </th>
              <th className="p-3.5 text-center hidden lg:table-cell">Trigger State</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredAndSortedHoldings.map((item) => {
              const curValue = item.qty * item.cmp;
              const pl = (item.cmp - item.buyPrice) * item.qty;
              const plPercent = item.buyPrice ? ((item.cmp - item.buyPrice) / item.buyPrice) * 100 : 0;
              const isProfit = pl >= 0;
              const isStopLoss = item.stopLoss > 0 && item.cmp <= item.stopLoss;
              const isTargetHit = item.sellPrice > 0 && item.cmp >= item.sellPrice;
              const taxInfo = getTaxCategory(item.buyDate);

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-150 group"
                >
                  {/* Stock Name & Ticker */}
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 dark:text-white tracking-tight">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        {item.ticker}
                      </span>
                      {item.dayChangePercent !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1 rounded ${
                            item.dayChangePercent >= 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80'
                          }`}
                        >
                          {item.dayChangePercent >= 0 ? '+' : ''}{item.dayChangePercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Sector */}
                  <td className="p-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.sector || 'General'}
                    </span>
                  </td>

                  {/* Buy Date & Holding Duration */}
                  <td className="p-3.5">
                    {editingDateId === item.id ? (
                      <div className="flex items-center gap-1.5 min-w-[200px]">
                        <CalendarPicker
                          value={tempDate}
                          onChange={(newD) => {
                            setTempDate(newD);
                            saveDate(item.id, newD);
                          }}
                          className="w-full"
                        />
                        <button
                          onClick={() => saveDate(item.id)}
                          className="p-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs shrink-0 cursor-pointer"
                          title="Save date"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditDate(item)}
                        className="cursor-pointer group/date"
                        title="Click to open calendar & edit purchase date"
                      >
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 font-mono">
                          <span>{formatDate(item.buyDate)}</span>
                          <Calendar className="w-3 h-3 text-indigo-500 opacity-60 group-hover/date:opacity-100 transition" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            {formatHoldingDuration(item.buyDate)}
                          </span>
                          <span
                            className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                              taxInfo.type === 'LTCG'
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                            title={taxInfo.label}
                          >
                            {taxInfo.type}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="p-3.5 text-right font-medium text-slate-800 dark:text-slate-200 font-mono">
                    {item.qty}
                  </td>

                  {/* Buy Price */}
                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                    {formatCurrency(item.buyPrice)}
                  </td>

                  {/* Current Market Price (CMP) */}
                  <td className="p-3.5 text-right">
                    <div className="font-bold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(item.cmp)}
                    </div>
                    {item.sellPrice > 0 && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        TGT: {formatCurrency(item.sellPrice)}
                      </div>
                    )}
                  </td>

                  {/* Current Value */}
                  <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                    {formatCurrency(curValue)}
                  </td>

                  {/* P/L */}
                  <td className="p-3.5 text-right">
                    <div
                      className={`font-bold font-mono ${
                        isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}{formatCurrency(pl)}
                    </div>
                    <div
                      className={`text-[11px] font-mono ${
                        isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}{plPercent.toFixed(2)}%
                    </div>
                  </td>

                  {/* Status / Triggers */}
                  <td className="p-3.5 text-center hidden lg:table-cell">
                    {isStopLoss ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <AlertTriangle className="w-3 h-3" /> STOP-LOSS
                      </span>
                    ) : isTargetHit ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Target className="w-3 h-3" /> TARGET HIT!
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        HOLDING
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Edit position details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${item.name} (${item.ticker}) from holdings?`)) {
                            onDelete(item.id);
                          }
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Delete holding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredAndSortedHoldings.length === 0 && (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-500 font-mono">
                  <div className="max-w-sm mx-auto space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      NO POSITIONS FOUND
                    </p>
                    <p className="text-xs text-slate-500">
                      {searchQuery
                        ? 'Try clearing your search query.'
                        : 'Click "+ ADD STOCK" at the top to add your first investment position.'}
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

