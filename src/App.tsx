import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Holding, WatchlistItem, SectorIndex, MarketBenchmark } from './types';
import { 
  DEFAULT_HOLDINGS, 
  DEFAULT_WATCHLIST, 
  INITIAL_SECTORS, 
  INITIAL_NIFTY 
} from './data/defaultData';
import { 
  loadHoldings, 
  saveHoldings, 
  loadWatchlist, 
  saveWatchlist 
} from './utils/storage';
import { fetchBatchQuotes, fetchIndicesData } from './services/marketService';
import { apiClient, AuthUser } from './services/apiClient';
import { Header } from './components/Header';
import { PortfolioMeta } from './components/PortfolioSwitcher';
import { BenchmarkBar } from './components/BenchmarkBar';
import { PortfolioStats } from './components/PortfolioStats';
import { HoldingsTable } from './components/HoldingsTable';
import { WatchlistTable } from './components/WatchlistTable';
import { SectorHealthTable } from './components/SectorHealthTable';
import { PortfolioAnalytics } from './components/PortfolioAnalytics';
import { ItemModal } from './components/ItemModal';
import { DeployModal } from './components/DeployModal';
import { AuthModal } from './components/AuthModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AlertsModal } from './components/AlertsModal';
import { BrokerImportModal } from './components/BrokerImportModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { Briefcase, Eye, Activity, PieChart, CheckCircle2, ShieldCheck, Database, ArrowRight, CloudUpload } from 'lucide-react';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('portfolio_theme_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // User Auth State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioMeta[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('portfolio-demo-main');

  // Data states
  const [holdings, setHoldings] = useState<Holding[]>(() => loadHoldings());
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => loadWatchlist());
  const [sectors, setSectors] = useState<SectorIndex[]>(INITIAL_SECTORS);
  const [nifty, setNifty] = useState<MarketBenchmark>(INITIAL_NIFTY);

  // UI states
  const [activeTab, setActiveTab] = useState<'holdings' | 'watchlist' | 'sectors' | 'analytics'>('holdings');
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(false);
  const [lastFetchDuration, setLastFetchDuration] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] = useState(false);
  const [dismissedMigrationBanner, setDismissedMigrationBanner] = useState(false);

  const [editingItem, setEditingItem] = useState<Holding | WatchlistItem | null>(null);
  const [modalType, setModalType] = useState<'holding' | 'watchlist'>('holding');

  // Sync dark mode class to <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('portfolio_theme_mode', String(darkMode));
  }, [darkMode]);

  // Persist holdings whenever changed
  useEffect(() => {
    saveHoldings(holdings);
  }, [holdings]);

  // Persist watchlist whenever changed
  useEffect(() => {
    saveWatchlist(watchlist);
  }, [watchlist]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Check login state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const res = await apiClient.getMe();
      if (res.success && res.data?.user) {
        setCurrentUser(res.data.user);
        loadUserPortfolios(res.data.user.id);
      }
    };
    checkAuth();
  }, []);

  const loadUserPortfolios = async (userId: string) => {
    try {
      const res = await apiClient.getPortfolios();
      if (res.success && res.data && res.data.length > 0) {
        setPortfolios(res.data);
        const defaultPort = res.data.find((p: any) => p.isDefault) || res.data[0];
        setActivePortfolioId(defaultPort.id);
        loadDatabasePortfolio(defaultPort.id);
      }
    } catch (err) {
      console.error('Failed to load user portfolios', err);
    }
  };

  const loadDatabasePortfolio = async (portfolioId: string) => {
    try {
      const res = await apiClient.getPortfolioSummary(portfolioId);
      if (res.success && res.data?.holdings) {
        const dbHoldings: Holding[] = res.data.holdings.map((h: any) => ({
          id: h.id,
          name: h.name,
          ticker: h.ticker,
          sector: h.sector,
          qty: h.qty,
          buyPrice: h.buyPrice,
          buyDate: h.buyDate || new Date().toISOString().slice(0, 10),
          cmp: h.cmp,
          sellPrice: h.sellPrice || Math.round(h.buyPrice * 1.2 * 100) / 100,
          stopLoss: h.stopLoss || Math.round(h.buyPrice * 0.9 * 100) / 100,
          notes: h.notes,
          dayChange: h.dayChange,
          dayChangePercent: h.dayChangePercent,
          updatedAt: new Date().toISOString(),
        }));
        if (dbHoldings.length > 0) {
          setHoldings(dbHoldings);
        }
      }
    } catch (err) {
      console.error('Failed to load portfolio details from database', err);
    }
  };

  const handleCreatePortfolio = async (name: string, description?: string) => {
    try {
      const res = await apiClient.createPortfolio(name, description);
      if (res.success && res.data) {
        setPortfolios((prev) => [...prev, res.data]);
        setActivePortfolioId(res.data.id);
        setHoldings([]);
        showToast(`Created portfolio "${name}"`);
      }
    } catch (err) {
      alert('Failed to create portfolio');
    }
  };

  const handleSelectPortfolio = (id: string) => {
    setActivePortfolioId(id);
    loadDatabasePortfolio(id);
    showToast('Switched portfolio');
  };

  const handleLogout = async () => {
    await apiClient.logout();
    setCurrentUser(null);
    setPortfolios([]);
    showToast('Signed out');
  };

  /**
   * Ultra-fast batch fetch of all market data (Quotes + Benchmark + Sectors in parallel)
   */
  const handleFetchAllMarketData = useCallback(async () => {
    setIsLoadingPrices(true);
    const startTime = performance.now();

    try {
      // 1. Gather all unique tickers from holdings, watchlist, and sector indices
      const holdingTickers = holdings.map((h) => h.ticker);
      const watchlistTickers = watchlist.map((w) => w.ticker);
      const allTickers = Array.from(new Set([...holdingTickers, ...watchlistTickers]));

      // 2. Fetch stock quotes & index data simultaneously in parallel
      const [quotesMap, indicesResult] = await Promise.all([
        fetchBatchQuotes(allTickers),
        fetchIndicesData(sectors),
      ]);

      let newlyHitTargets = 0;

      // 3. Update holdings with fast quotes
      setHoldings((prevHoldings) =>
        prevHoldings.map((item) => {
          const q = quotesMap[item.ticker.toUpperCase()];
          if (q && q.price) {
            const wasBelowTarget = item.cmp < item.sellPrice;
            const isNowTargetHit = item.sellPrice > 0 && q.price >= item.sellPrice;
            if (wasBelowTarget && isNowTargetHit) {
              newlyHitTargets++;
            }

            return {
              ...item,
              cmp: q.price,
              dayChange: q.change,
              dayChangePercent: q.changePercent,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        })
      );

      // 4. Update watchlist with fast quotes
      setWatchlist((prevWatchlist) =>
        prevWatchlist.map((item) => {
          const q = quotesMap[item.ticker.toUpperCase()];
          if (q && q.price) {
            return {
              ...item,
              cmp: q.price,
              dayChange: q.change,
              dayChangePercent: q.changePercent,
            };
          }
          return item;
        })
      );

      // 5. Update benchmark and sector indices
      if (indicesResult.nifty) {
        setNifty(indicesResult.nifty);
      }
      if (indicesResult.sectors && indicesResult.sectors.length > 0) {
        setSectors(indicesResult.sectors);
      }

      const elapsed = Math.round(performance.now() - startTime);
      setLastFetchDuration(elapsed);
      setLastUpdated(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );

      if (newlyHitTargets > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast(`🎯 Target price achieved on ${newlyHitTargets} holding(s)!`, 'success');
      } else {
        showToast(`⚡ Live prices synced in ${elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`}`);
      }
    } catch (err) {
      console.error('Failed to sync market prices', err);
      showToast('Price sync finished with available data', 'info');
    } finally {
      setIsLoadingPrices(false);
    }
  }, [holdings, watchlist, sectors]);

  // Initial fetch on mount
  useEffect(() => {
    handleFetchAllMarketData();
  }, []);

  // Save / Edit Holding handler
  const handleSaveHolding = async (newHolding: Holding) => {
    setHoldings((prev) => {
      const idx = prev.findIndex((h) => h.id === newHolding.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newHolding;
        return next;
      }
      return [newHolding, ...prev];
    });
    showToast(`Saved position ${newHolding.name} (${newHolding.ticker})`);

    // If logged in, also push transaction to server
    if (currentUser) {
      apiClient.addTransaction({
        portfolioId: activePortfolioId,
        symbol: newHolding.ticker,
        name: newHolding.name,
        sector: newHolding.sector,
        type: 'BUY',
        quantity: newHolding.qty,
        price: newHolding.buyPrice,
        date: newHolding.buyDate,
        notes: newHolding.notes,
      }).catch((e) => console.warn('Server transaction record notice:', e));
    }

    // Instantly sync latest live quote in background
    try {
      const quotesMap = await fetchBatchQuotes([newHolding.ticker]);
      const cleanSym = newHolding.ticker.toUpperCase();
      const q =
        quotesMap[cleanSym] ||
        quotesMap[`${cleanSym}.NS`] ||
        quotesMap[`${cleanSym}.BO`] ||
        Object.values(quotesMap)[0];

      if (q && q.price) {
        setHoldings((prev) =>
          prev.map((h) =>
            h.id === newHolding.id
              ? {
                  ...h,
                  cmp: q.price,
                  dayChange: q.change ?? h.dayChange,
                  dayChangePercent: q.changePercent ?? h.dayChangePercent,
                  updatedAt: new Date().toISOString(),
                }
              : h
          )
        );
      }
    } catch {
      // background sync error ignored
    }
  };

  // Save / Edit Watchlist handler
  const handleSaveWatchlist = async (newItem: WatchlistItem) => {
    setWatchlist((prev) => {
      const idx = prev.findIndex((w) => w.id === newItem.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newItem;
        return next;
      }
      return [newItem, ...prev];
    });
    showToast(`Added ${newItem.name} to Watchlist`);

    // Instantly sync latest live quote in background
    try {
      const quotesMap = await fetchBatchQuotes([newItem.ticker]);
      const cleanSym = newItem.ticker.toUpperCase();
      const q =
        quotesMap[cleanSym] ||
        quotesMap[`${cleanSym}.NS`] ||
        quotesMap[`${cleanSym}.BO`] ||
        Object.values(quotesMap)[0];

      if (q && q.price) {
        setWatchlist((prev) =>
          prev.map((w) =>
            w.id === newItem.id
              ? {
                  ...w,
                  cmp: q.price,
                  dayChange: q.change ?? w.dayChange,
                  dayChangePercent: q.changePercent ?? w.dayChangePercent,
                }
              : w
          )
        );
      }
    } catch {
      // background sync error ignored
    }
  };

  // Quick Inline Date Update handler
  const handleUpdateBuyDate = (id: string, newDate: string) => {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, buyDate: newDate, updatedAt: new Date().toISOString() } : h))
    );
    showToast('Purchase date updated successfully');
  };

  // Delete handlers
  const handleDeleteHolding = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
    showToast('Holding deleted', 'info');
  };

  const handleDeleteWatchlist = (id: string) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
    showToast('Watchlist item removed', 'info');
  };

  // Move from Watchlist to Active Holdings
  const handleMoveToHoldings = (item: WatchlistItem) => {
    const defaultQty = 10;
    const defaultBuyPrice = item.cmp || item.targetEntryPrice || 100;
    const qtyInput = prompt(`Enter quantity to buy for ${item.name}:`, String(defaultQty));
    if (!qtyInput) return;

    const qty = Number(qtyInput);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    const buyPriceInput = prompt(`Enter purchase price per share (₹):`, String(defaultBuyPrice));
    const buyPrice = Number(buyPriceInput) || defaultBuyPrice;

    const buyDateInput = prompt(
      `Enter purchase date (YYYY-MM-DD):`,
      new Date().toISOString().slice(0, 10)
    );
    const finalBuyDate = buyDateInput || new Date().toISOString().slice(0, 10);

    const newHolding: Holding = {
      id: `hold-${Date.now()}`,
      name: item.name,
      ticker: item.ticker,
      sector: item.sector,
      qty,
      buyPrice,
      buyDate: finalBuyDate,
      cmp: item.cmp || buyPrice,
      sellPrice: item.targetSellPrice || Math.round(buyPrice * 1.2 * 100) / 100,
      stopLoss: item.stopLoss || Math.round(buyPrice * 0.9 * 100) / 100,
      notes: item.notes,
      updatedAt: new Date().toISOString(),
    };

    setHoldings((prev) => [newHolding, ...prev]);
    setWatchlist((prev) => prev.filter((w) => w.id !== item.id));
    showToast(`Moved ${item.name} into Active Holdings!`);
  };

  // Full Import JSON
  const handleImportData = (importedHoldings: Holding[], importedWatchlist: WatchlistItem[]) => {
    setHoldings(importedHoldings);
    setWatchlist(importedWatchlist);
    showToast('Portfolio imported successfully!');
    setTimeout(() => {
      handleFetchAllMarketData();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded bg-slate-900 text-white shadow-2xl border border-slate-700 text-xs font-mono font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <Header
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          isLoading={isLoadingPrices}
          lastFetchDuration={lastFetchDuration}
          lastUpdated={lastUpdated}
          onFetchPrices={handleFetchAllMarketData}
          onOpenAddModal={() => {
            setEditingItem(null);
            setModalType(activeTab === 'watchlist' ? 'watchlist' : 'holding');
            setIsItemModalOpen(true);
          }}
          onOpenDeployModal={() => setIsDeployModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenUserSettings={() => setIsUserSettingsModalOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          portfolios={portfolios}
          activePortfolioId={activePortfolioId}
          onSelectPortfolio={handleSelectPortfolio}
          onCreatePortfolio={handleCreatePortfolio}
          holdings={holdings}
          watchlist={watchlist}
          onImportData={handleImportData}
        />

        {/* Benchmark Bar (Nifty 50 + EMAs) */}
        <BenchmarkBar nifty={nifty} />

        {/* Local Storage Data Migration Banner (Offered to logged in users who have un-synced local data) */}
        {currentUser && holdings.length > 0 && !dismissedMigrationBanner && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 font-mono text-xs text-indigo-900 dark:text-indigo-200">
            <div className="flex items-center gap-2.5">
              <CloudUpload className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="font-bold">Sync Browser Portfolio to Cloud:</span>{' '}
                <span>
                  You have {holdings.length} position{holdings.length > 1 ? 's' : ''} currently loaded in your browser session. Save them permanently to your account database.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setDismissedMigrationBanner(true)}
                className="px-2.5 py-1 rounded text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-xs"
              >
                <span>Migrate to Database</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Key Metrics Stats Grid */}
        <PortfolioStats holdings={holdings} watchlist={watchlist} />

        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 max-w-full font-mono">
            <button
              id="tab-holdings"
              onClick={() => setActiveTab('holdings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                activeTab === 'holdings'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>ACTIVE HOLDINGS</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeTab === 'holdings'
                    ? 'bg-indigo-800 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                }`}
              >
                {holdings.length}
              </span>
            </button>

            <button
              id="tab-watchlist"
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                activeTab === 'watchlist'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>WATCHLIST</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeTab === 'watchlist'
                    ? 'bg-indigo-800 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                }`}
              >
                {watchlist.length}
              </span>
            </button>

            <button
              id="tab-sectors"
              onClick={() => setActiveTab('sectors')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                activeTab === 'sectors'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>SECTOR MOMENTUM</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeTab === 'sectors'
                    ? 'bg-indigo-800 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                }`}
              >
                {sectors.length}
              </span>
            </button>

            <button
              id="tab-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-bold transition cursor-pointer border ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>ALLOCATION RISK</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        <main>
          {activeTab === 'holdings' && (
            <HoldingsTable
              holdings={holdings}
              onEdit={(holding) => {
                setEditingItem(holding);
                setModalType('holding');
                setIsItemModalOpen(true);
              }}
              onDelete={handleDeleteHolding}
              onUpdateBuyDate={handleUpdateBuyDate}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistTable
              watchlist={watchlist}
              onEdit={(item) => {
                setEditingItem(item);
                setModalType('watchlist');
                setIsItemModalOpen(true);
              }}
              onDelete={handleDeleteWatchlist}
              onMoveToHoldings={handleMoveToHoldings}
            />
          )}

          {activeTab === 'sectors' && <SectorHealthTable sectors={sectors} />}

          {activeTab === 'analytics' && <PortfolioAnalytics holdings={holdings} />}
        </main>

        {/* Bottom Analytics when on holdings tab */}
        {activeTab === 'holdings' && holdings.length > 0 && (
          <div className="pt-2">
            <PortfolioAnalytics holdings={holdings} />
          </div>
        )}
      </div>

      {/* Add / Edit Position Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSaveHolding={handleSaveHolding}
        onSaveWatchlist={handleSaveWatchlist}
        initialItem={editingItem}
        initialType={modalType}
      />

      {/* Deploy to GitHub & Vercel Modal */}
      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />

      {/* Multi-User Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          loadUserPortfolios(user.id);
          showToast(`Welcome, ${user.name}!`);
        }}
      />

      {/* Platform Admin Console Modal */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Alerts & Triggers Modal */}
      <AlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
      />

      {/* Broker CSV Import Modal */}
      <BrokerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        portfolioId={activePortfolioId}
        currentLocalHoldings={holdings}
        onImportSuccess={() => {
          loadDatabasePortfolio(activePortfolioId);
          showToast('Transactions synced to database!');
        }}
      />

      {/* Account Settings & Security Modal */}
      <UserSettingsModal
        isOpen={isUserSettingsModalOpen}
        onClose={() => setIsUserSettingsModalOpen(false)}
        user={currentUser}
        onUserLoggedOut={handleLogout}
      />
    </div>
  );
}
