import React, { useState } from 'react';
import { Briefcase, ChevronDown, Plus, Check } from 'lucide-react';

export interface PortfolioMeta {
  id: string;
  name: string;
  description?: string;
  baseCurrency: string;
  isDefault: boolean;
}

interface PortfolioSwitcherProps {
  portfolios: PortfolioMeta[];
  activePortfolioId: string;
  onSelectPortfolio: (id: string) => void;
  onCreatePortfolio: (name: string, description?: string) => Promise<void>;
}

export const PortfolioSwitcher: React.FC<PortfolioSwitcherProps> = ({
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  onCreatePortfolio,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = useState('');

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) || portfolios[0];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;

    await onCreatePortfolio(newPortfolioName.trim(), newPortfolioDesc.trim() || undefined);
    setNewPortfolioName('');
    setNewPortfolioDesc('');
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative font-mono">
      <button
        id="portfolio-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer text-xs font-bold"
      >
        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
        <span className="max-w-[150px] truncate">{activePortfolio?.name || 'Main Portfolio'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-72 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
            Your Portfolios
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {portfolios.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPortfolio(p.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition cursor-pointer ${
                  p.id === activePortfolioId
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="truncate">{p.name}</div>
                  {p.description && (
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px] font-normal">
                      {p.description}
                    </div>
                  )}
                </div>
                {p.id === activePortfolioId && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            ))}
          </div>

          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <input
                type="text"
                required
                placeholder="Portfolio name (e.g. Dividend Yield)"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="w-full p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2 py-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-500 text-[11px]"
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 px-2 py-1.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition font-bold text-[11px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Portfolio</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
