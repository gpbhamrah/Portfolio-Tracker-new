import React, { useRef } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  Github, 
  FileSpreadsheet, 
  Bell,
  ShieldAlert,
  User,
  LogOut,
  LogIn,
  Layers,
  Database
} from 'lucide-react';
import { Holding, WatchlistItem } from '../types';
import { exportToCSV, exportToJSON } from '../utils/storage';
import { AuthUser } from '../services/apiClient';
import { PortfolioSwitcher, PortfolioMeta } from './PortfolioSwitcher';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isLoading: boolean;
  lastFetchDuration: number | null;
  lastUpdated: string;
  onFetchPrices: () => void;
  onOpenAddModal: () => void;
  onOpenDeployModal: () => void;
  onOpenAuthModal: () => void;
  onOpenAdminModal: () => void;
  onOpenAlertsModal: () => void;
  onOpenImportModal: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  portfolios: PortfolioMeta[];
  activePortfolioId: string;
  onSelectPortfolio: (id: string) => void;
  onCreatePortfolio: (name: string, description?: string) => Promise<void>;
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
  onOpenAuthModal,
  onOpenAdminModal,
  onOpenAlertsModal,
  onOpenImportModal,
  currentUser,
  onLogout,
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  onCreatePortfolio,
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
    <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm dark:shadow-lg dark:shadow-black/20 transition-colors duration-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Left Branding */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-sm flex items-center justify-center font-bold text-white text-base shadow-sm font-mono">
            P
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">
                PORTFOLIO<span className="text-indigo-600 dark:text-indigo-400">.ENGINE</span>
              </h1>
              <span className="text-slate-400 dark:text-slate-500 font-mono text-xs font-normal">v2.4.0</span>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>POSTGRES + LIVE CMP</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-user Indian equity platform with database persistence, live quotes & FIFO metrics
            </p>
          </div>

          {/* Portfolio Switcher Dropdown */}
          {portfolios.length > 0 && (
            <div className="ml-0 sm:ml-2">
              <PortfolioSwitcher
                portfolios={portfolios}
                activePortfolioId={activePortfolioId}
                onSelectPortfolio={onSelectPortfolio}
                onCreatePortfolio={onCreatePortfolio}
              />
            </div>
          )}
        </div>

        {/* Right Status Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Admin Console Button if ADMIN */}
          {currentUser?.role === 'ADMIN' && (
            <button
              id="admin-console-btn"
              onClick={onOpenAdminModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
              title="Open Platform Telemetry & Admin Console"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ADMIN</span>
            </button>
          )}

          {/* Alerts Trigger Button */}
          <button
            id="alerts-btn"
            onClick={onOpenAlertsModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="Manage Price Alerts & Triggers"
          >
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>ALERTS</span>
          </button>

          {/* Fast Live CMP Fetch Button */}
          <button
            id="fetch-cmp-btn"
            onClick={onFetchPrices}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm transition disabled:opacity-60 cursor-pointer"
            title="Fetches all market quotes in a single parallel batch (<400ms)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'SYNCING...' : 'FETCH CMP'}</span>
            {lastFetchDuration !== null && !isLoading && (
              <span className="px-1 py-0.2 text-[10px] bg-emerald-800/80 rounded font-mono">
                {lastFetchDuration < 1000 ? `${lastFetchDuration}ms` : `${(lastFetchDuration / 1000).toFixed(1)}s`}
              </span>
            )}
          </button>

          {/* Add Stock Button */}
          <button
            id="add-item-btn"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD STOCK</span>
          </button>

          {/* Broker CSV / Statement Import */}
          <button
            id="broker-import-btn"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer font-mono"
            title="Import Zerodha, Groww, Upstox CSV or Migrate Local Storage"
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>IMPORT</span>
          </button>

          {/* Deploy Modal Guide */}
          <button
            id="deploy-vercel-btn"
            onClick={onOpenDeployModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer font-mono"
            title="Vercel & GitHub Deployment Specs"
          >
            <Github className="w-3.5 h-3.5 text-indigo-500" />
            <span>DEPLOY</span>
          </button>

          {/* Export CSV / JSON Group */}
          <div className="flex items-center rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5">
            <button
              id="export-csv-btn"
              onClick={() => exportToCSV(holdings)}
              className="p-1 px-2 rounded text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              title="Export CSV spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              id="export-json-btn"
              onClick={() => exportToJSON(holdings, watchlist)}
              className="p-1 px-2 rounded text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              title="Export JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>JSON</span>
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <button
            id="dark-mode-toggle"
            onClick={onToggleDarkMode}
            className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* User Profile / Auth Toggle */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800 font-mono">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
              </div>
              <button
                id="logout-btn"
                onClick={onLogout}
                className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="open-login-btn"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>SIGN IN</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Output Subheader */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">LAST CMP FETCH:</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">{lastUpdated || 'INITIALIZING'}</span>
          {lastFetchDuration !== null && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">({lastFetchDuration}ms latency)</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>DATABASE: {currentUser ? 'MULTI_USER_POSTGRES' : 'LOCAL_KV_BACKED'}</span>
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-600">//</span>
          <span className="hidden md:inline text-slate-500 font-mono">FEED: YAHOO_SERVER_CACHED</span>
        </div>
      </div>
    </header>
  );
};
