import React, { useState, useEffect } from 'react';
import { Holding, WatchlistItem } from '../types';
import { POPULAR_TICKERS } from '../data/defaultData';
import { fetchBatchQuotes } from '../services/marketService';
import { formatCurrency, formatHoldingDuration } from '../utils/formatters';
import { 
  X, 
  Calendar, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  ShieldAlert, 
  Check, 
  Search 
} from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHolding: (holding: Holding) => void;
  onSaveWatchlist: (item: WatchlistItem) => void;
  initialItem?: Holding | WatchlistItem | null;
  initialType?: 'holding' | 'watchlist';
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSaveHolding,
  onSaveWatchlist,
  initialItem,
  initialType = 'holding',
}) => {
  const [type, setType] = useState<'holding' | 'watchlist'>(initialType);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [sector, setSector] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [cmp, setCmp] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [stopLoss, setStopLoss] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isFetchingCmp, setIsFetchingCmp] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setTicker(initialItem.ticker || '');
      setSector(initialItem.sector || '');
      setCmp(initialItem.cmp || '');
      setNotes(initialItem.notes || '');

      if ('qty' in initialItem) {
        setType('holding');
        setQty(initialItem.qty);
        setBuyPrice(initialItem.buyPrice);
        setBuyDate(initialItem.buyDate || new Date().toISOString().slice(0, 10));
        setSellPrice(initialItem.sellPrice || '');
        setStopLoss(initialItem.stopLoss || '');
      } else {
        setType('watchlist');
        setBuyPrice(initialItem.targetEntryPrice);
        setBuyDate(initialItem.addedDate || new Date().toISOString().slice(0, 10));
        setSellPrice(initialItem.targetSellPrice || '');
        setStopLoss(initialItem.stopLoss || '');
      }
    } else {
      resetForm(initialType === 'watchlist' ? 'watchlist' : 'holding');
    }
  }, [initialItem, initialType, isOpen]);

  const resetForm = (t: 'holding' | 'watchlist') => {
    setType(t);
    setName('');
    setTicker('');
    setSector('');
    setQty(10);
    setBuyPrice('');
    setBuyDate(new Date().toISOString().slice(0, 10));
    setCmp('');
    setSellPrice('');
    setStopLoss('');
    setNotes('');
  };

  const fetchLiveCmpForTicker = async (targetTicker: string, updateMetadata = true) => {
    const cleanTicker = targetTicker.trim().toUpperCase();
    if (!cleanTicker || cleanTicker.length < 2) return;

    // Check popular tickers for instant metadata (name and sector)
    const match = POPULAR_TICKERS.find(
      (t) =>
        t.ticker.toUpperCase() === cleanTicker ||
        t.ticker.toUpperCase() === `${cleanTicker}.NS` ||
        t.name.toUpperCase() === cleanTicker
    );
    if (match && updateMetadata) {
      if (!name) setName(match.name);
      if (!sector) setSector(match.sector);
    }

    setIsFetchingCmp(true);
    try {
      const quotes = await fetchBatchQuotes([cleanTicker]);
      const quote =
        quotes[cleanTicker] ||
        quotes[`${cleanTicker}.NS`] ||
        quotes[`${cleanTicker}.BO`] ||
        Object.values(quotes)[0];

      if (quote && quote.price) {
        setCmp(quote.price);
        if (quote.name && !name && updateMetadata) {
          setName(quote.name);
        }
        if (!sellPrice) {
          setSellPrice(Math.round(quote.price * 1.2 * 100) / 100);
        }
        if (!stopLoss) {
          setStopLoss(Math.round(quote.price * 0.9 * 100) / 100);
        }
      }
    } catch (e) {
      console.warn('Auto CMP fetch error for', cleanTicker, e);
    } finally {
      setIsFetchingCmp(false);
    }
  };

  // Auto-fetch CMP when user types a ticker with a slight debounce
  useEffect(() => {
    if (!isOpen || !ticker || ticker.trim().length < 2) return;
    const timer = setTimeout(() => {
      fetchLiveCmpForTicker(ticker, true);
    }, 450);
    return () => clearTimeout(timer);
  }, [ticker, isOpen]);

  if (!isOpen) return null;

  const handleSelectSuggestion = async (item: { name: string; ticker: string; sector: string }) => {
    setName(item.name);
    setTicker(item.ticker);
    setSector(item.sector);
    setShowSuggestions(false);
    await fetchLiveCmpForTicker(item.ticker, false);
  };

  const handleFetchLivePrice = async () => {
    if (!ticker) return;
    await fetchLiveCmpForTicker(ticker, true);
  };

  const setDatePreset = (preset: 'today' | 'yesterday' | '1m' | '6m' | '1y') => {
    const d = new Date();
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    } else if (preset === '1m') {
      d.setMonth(d.getMonth() - 1);
    } else if (preset === '6m') {
      d.setMonth(d.getMonth() - 6);
    } else if (preset === '1y') {
      d.setFullYear(d.getFullYear() - 1);
    }
    setBuyDate(d.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ticker) {
      alert('Please provide Stock Name and Ticker.');
      return;
    }

    const currentTicker = ticker.trim().toUpperCase();
    let currentCmp = Number(cmp);

    // If CMP is not yet populated, try fetching live price one time
    if (!currentCmp || isNaN(currentCmp)) {
      try {
        const quotes = await fetchBatchQuotes([currentTicker]);
        const q = quotes[currentTicker] || quotes[`${currentTicker}.NS`];
        if (q && q.price) {
          currentCmp = q.price;
        }
      } catch {
        // fallback
      }
    }

    const finalCmp = currentCmp > 0 ? currentCmp : (Number(buyPrice) || 0);
    const finalBuyPrice = Number(buyPrice) || (finalCmp > 0 ? finalCmp : 0);

    if (type === 'holding') {
      const holding: Holding = {
        id: initialItem?.id || `hold-${Date.now()}`,
        name: name.trim(),
        ticker: currentTicker,
        sector: sector.trim() || 'General',
        qty: Number(qty) || 1,
        buyPrice: finalBuyPrice,
        buyDate: buyDate || new Date().toISOString().slice(0, 10),
        cmp: finalCmp,
        sellPrice: Number(sellPrice) || 0,
        stopLoss: Number(stopLoss) || 0,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      };
      onSaveHolding(holding);
    } else {
      const watchItem: WatchlistItem = {
        id: initialItem?.id || `watch-${Date.now()}`,
        name: name.trim(),
        ticker: currentTicker,
        sector: sector.trim() || 'General',
        targetEntryPrice: finalBuyPrice,
        cmp: finalCmp,
        addedDate: buyDate || new Date().toISOString().slice(0, 10),
        targetSellPrice: Number(sellPrice) || 0,
        stopLoss: Number(stopLoss) || 0,
        notes: notes.trim(),
      };
      onSaveWatchlist(watchItem);
    }

    onClose();
  };

  const filteredSuggestions = POPULAR_TICKERS.filter(
    (t) =>
      t.name.toLowerCase().includes(ticker.toLowerCase()) ||
      t.ticker.toLowerCase().includes(ticker.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 rounded-lg max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-800 transition-colors max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight font-mono">
              {initialItem ? 'EDIT INVESTMENT POSITION' : 'ADD NEW POSITION'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Enter purchase date, price targets & ticker details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Position Type Selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">
              Position Category
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button
                type="button"
                onClick={() => setType('holding')}
                className={`py-2 px-3 rounded text-xs font-bold border transition cursor-pointer ${
                  type === 'holding'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                ACTIVE HOLDING
              </button>
              <button
                type="button"
                onClick={() => setType('watchlist')}
                className={`py-2 px-3 rounded text-xs font-bold border transition cursor-pointer ${
                  type === 'watchlist'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                WATCHLIST SETUP
              </button>
            </div>
          </div>

          {/* Ticker & Name with Autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Stock Symbol / Ticker *
                </label>
                {isFetchingCmp ? (
                  <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    SYNCING CMP...
                  </span>
                ) : cmp ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    LIVE CMP: ₹{Number(cmp).toLocaleString('en-IN')}
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. RELIANCE, TCS, INFY"
                  value={ticker}
                  onChange={(e) => {
                    setTicker(e.target.value.toUpperCase());
                    setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    if (ticker && ticker.trim().length >= 2) {
                      fetchLiveCmpForTicker(ticker, true);
                    }
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white font-mono uppercase focus:outline-none focus:border-indigo-500 pr-9"
                />
                {ticker && (
                  <button
                    type="button"
                    onClick={handleFetchLivePrice}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-indigo-400 hover:bg-slate-800 rounded cursor-pointer"
                    title="Fetch live CMP now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingCmp ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && ticker.length >= 2 && filteredSuggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-700 rounded shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-800 font-mono">
                  {filteredSuggestions.map((item) => (
                    <button
                      type="button"
                      key={item.ticker}
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-2 hover:bg-slate-800 text-xs flex justify-between items-center transition cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-white">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{item.ticker}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.sector}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                Company / Stock Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Reliance Industries"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Sector & Buy Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                Sector / Industry
              </label>
              <input
                type="text"
                placeholder="e.g. IT, Energy, Banking, Auto"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Buy Date / Added Date Picker */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-indigo-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{type === 'holding' ? 'Purchase (Buy) Date *' : 'Added Date'}</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatHoldingDuration(buyDate)} held
                </span>
              </div>
              <input
                type="date"
                required
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              {/* Quick Date Presets */}
              <div className="flex gap-1.5 mt-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setDatePreset('today')}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('yesterday')}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('1m')}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  1m
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('1y')}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold cursor-pointer"
                >
                  1y (LTCG)
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Row: Qty, Buy Price, CMP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {type === 'holding' && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                  Quantity (Shares) *
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  placeholder="10"
                  value={qty}
                  onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  {type === 'holding' ? 'Avg Buy Price (₹) *' : 'Target Entry (₹) *'}
                </label>
                {typeof cmp === 'number' && cmp > 0 && buyPrice === '' && (
                  <button
                    type="button"
                    onClick={() => setBuyPrice(cmp)}
                    className="text-[9px] text-indigo-400 hover:underline font-mono cursor-pointer"
                  >
                    Use CMP
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 2450.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Live CMP (₹)
                </label>
                {ticker && (
                  <button
                    type="button"
                    onClick={handleFetchLivePrice}
                    className="text-[9px] text-indigo-400 hover:underline font-mono cursor-pointer flex items-center gap-0.5"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isFetchingCmp ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder={isFetchingCmp ? 'Fetching quote...' : 'Auto-fetched'}
                  value={cmp}
                  onChange={(e) => setCmp(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                {isFetchingCmp && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 font-mono animate-pulse">
                    FETCHING...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Targets: Sell Target & Stop Loss */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Target Exit Price (₹)</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 2800.00"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Stop Loss Price (₹)</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 2250.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
              Notes & Strategy Thesis
            </label>
            <textarea
              rows={2}
              placeholder="Investment thesis, technical levels, earnings..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 text-xs rounded border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Preview Bar */}
          {type === 'holding' && typeof qty === 'number' && typeof buyPrice === 'number' && buyPrice > 0 && (
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex flex-wrap justify-between items-center text-xs gap-2 font-mono">
              <div>
                <span className="text-slate-500">INVESTED: </span>
                <span className="font-bold text-white">
                  {formatCurrency(qty * buyPrice)}
                </span>
              </div>
              {typeof cmp === 'number' && cmp > 0 && (
                <div>
                  <span className="text-slate-500">P/L: </span>
                  <span
                    className={`font-bold ${
                      cmp >= buyPrice ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {cmp >= buyPrice ? '+' : ''}{formatCurrency((cmp - buyPrice) * qty)} (
                    {(((cmp - buyPrice) / buyPrice) * 100).toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition font-mono"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-md transition cursor-pointer font-mono"
            >
              {initialItem ? 'UPDATE POSITION' : 'SAVE POSITION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
