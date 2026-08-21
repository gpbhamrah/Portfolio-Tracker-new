import React, { useRef } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  TrendingUp, 
  Github, 
  FileSpreadsheet, 
  Zap,
  Globe
} from 'lucide-react';
import { Holding, WatchlistItem } from '../types';
import { exportToCSV, exportToJSON } from '../utils/storage';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isLoading: boolean;
  lastFetchDuration: number | null;
  lastUpdated: string;
  onFetchPrices: () => void;
  onOpenAddModal: () => void;
  onOpenDeployModal: () => void;
  holdings: Holding[];
  watchlist: WatchlistItem[];
  onImportData: (holdings: Holding[], watchlist: WatchlistItem[]) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  isLoading,
  lastFetchDuration,
  lastUpdated,
  onFetchPrices,
  onOpenAddModal,
  onOpenDeployModal,
  holdings,
  watchlist,
  onImportData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        let importedHoldings: Holding[] = [];
        let importedWatchlist: WatchlistItem[] = [];

        if (Array.isArray(parsed)) {
          importedHoldings = parsed;
        } else if (parsed.holdings) {
          importedHoldings = parsed.holdings;
          importedWatchlist = parsed.watchlist || [];
        }

        if (importedHoldings.length > 0 || importedWatchlist.length > 0) {
          onImportData(importedHoldings, importedWatchlist);
        }
      } catch (err) {
        alert('Failed to parse JSON file. Please ensure it is a valid portfolio export file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="bg-slate-900 border border-slate-800 rounded-lg p-5 sm:p-6 shadow-lg shadow-black/20 transition-colors duration-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Left Branding - Geometric Balance style */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-sm flex items-center justify-center font-bold text-white text-base shadow-sm font-mono">
            P
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
                PORTFOLIO<span className="text-indigo-400">.ENGINE</span>
              </h1>
              <span className="text-slate-500 font-mono text-xs font-normal">v2.4.0</span>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-300">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span>LIVE CMP</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-frequency stock & sector portfolio manager with holding dates, live CMP & Vercel edge deployment
            </p>
          </div>
        </div>

        {/* Right Status Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Vercel & GitHub Telemetry Badges */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded text-xs font-mono text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span>GITHUB: <span className="text-slate-100 font-semibold">main</span></span>
          </div>

          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded text-xs font-mono text-slate-300">
            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
            <span>VERCEL: <span className="text-slate-100 font-semibold">edge</span></span>
          </div>

          {/* Fast Live CMP Fetch Button */}
          <button
            id="fetch-cmp-btn"
            onClick={onFetchPrices}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm transition disabled:opacity-60 cursor-pointer"
            title="Fetches all market quotes in a single parallel batch (<400ms)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'SYNCING...' : 'FETCH CMP'}</span>
            {lastFetchDuration !== null && !isLoading && (
              <span className="px-1.5 py-0.2 text-[10px] bg-emerald-800/80 rounded font-mono">
                {lastFetchDuration < 1000 ? `${lastFetchDuration}ms` : `${(lastFetchDuration / 1000).toFixed(1)}s`}
              </span>
            )}
          </button>

          {/* Add Stock Button */}
          <button
            id="add-item-btn"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD STOCK</span>
          </button>

          {/* Deploy to GitHub & Vercel */}
          <button
            id="deploy-vercel-btn"
            onClick={onOpenDeployModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Guide to deploy live on Vercel and push to GitHub"
          >
            <Github className="w-3.5 h-3.5 text-indigo-400" />
            <span>DEPLOY VERCEL</span>
          </button>

          {/* Export CSV / JSON Group */}
          <div className="flex items-center rounded bg-slate-800 border border-slate-700 p-0.5">
            <button
              id="export-csv-btn"
              onClick={() => exportToCSV(holdings)}
              className="p-1.5 px-2.5 rounded text-xs font-mono font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center gap-1"
              title="Export CSV spreadsheet with Buy Dates & P/L"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </button>
            <button
              id="export-json-btn"
              onClick={() => exportToJSON(holdings, watchlist)}
              className="p-1.5 px-2.5 rounded text-xs font-mono font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center gap-1"
              title="Export JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>JSON</span>
            </button>
          </div>

          {/* Import JSON */}
          <button
            id="import-json-btn"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Import JSON backup"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {/* Dark Mode Toggle */}
          <button
            id="dark-mode-toggle"
            onClick={onToggleDarkMode}
            className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Telemetry Output Subheader */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">LAST CMP FETCH:</span>
          <span className="text-slate-200 font-medium">{lastUpdated || 'INITIALIZING'}</span>
          {lastFetchDuration !== null && (
            <span className="text-emerald-400 font-semibold">({lastFetchDuration}ms latency)</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>STORAGE: LOCAL_KV_PERSISTED</span>
          </span>
          <span className="hidden md:inline text-slate-600">//</span>
          <span className="hidden md:inline text-slate-500 font-mono">CLUSTER: vercel-iad1</span>
        </div>
      </div>
    </header>
  );
};

