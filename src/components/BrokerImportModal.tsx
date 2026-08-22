import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { Holding } from '../types';

interface BrokerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  currentLocalHoldings: Holding[];
  onImportSuccess: () => void;
}

export const BrokerImportModal: React.FC<BrokerImportModalProps> = ({
  isOpen,
  onClose,
  portfolioId,
  currentLocalHoldings,
  onImportSuccess,
}) => {
  const [csvContent, setCsvContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ importedCount: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!csvContent.trim()) {
      alert('Please paste CSV contents or upload a file first.');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      const res = await apiClient.importBrokerCSV(portfolioId, csvContent);
      if (res.success && res.data) {
        setImportResult(res.data);
        onImportSuccess();
      } else {
        setImportResult({
          importedCount: 0,
          errors: [res.error?.message || 'Failed to import CSV transactions'],
        });
      }
    } catch (err: any) {
      setImportResult({
        importedCount: 0,
        errors: [err.message || 'Import failure'],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Migrate Local Storage positions to Database
  const handleMigrateLocalStorage = async () => {
    if (currentLocalHoldings.length === 0) {
      alert('No local holdings found to migrate.');
      return;
    }

    setIsProcessing(true);
    try {
      let migrated = 0;
      for (const h of currentLocalHoldings) {
        await apiClient.addTransaction({
          portfolioId,
          symbol: h.ticker,
          name: h.name,
          sector: h.sector,
          type: 'BUY',
          quantity: h.qty,
          price: h.buyPrice,
          date: h.buyDate,
          notes: h.notes || 'Migrated from Local Storage',
        });
        migrated++;
      }

      setImportResult({
        importedCount: migrated,
        errors: [],
      });
      onImportSuccess();
    } catch (err: any) {
      setImportResult({
        importedCount: 0,
        errors: [err.message || 'Migration error'],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold font-mono">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Import Portfolio & Transactions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zerodha, Groww, Upstox CSV or Migrate Local Storage
              </p>
            </div>
          </div>
          <button
            id="close-import-modal"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick LocalStorage Migration Option */}
          {currentLocalHoldings.length > 0 && (
            <div className="p-4 rounded border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Migrate {currentLocalHoldings.length} Existing Local Positions</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Synchronize your current browser session holdings to PostgreSQL database.
                </p>
              </div>
              <button
                id="migrate-local-btn"
                onClick={handleMigrateLocalStorage}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer whitespace-nowrap"
              >
                {isProcessing ? 'Syncing...' : 'Sync to Database'}
              </button>
            </div>
          )}

          {/* Result banner */}
          {importResult && (
            <div
              className={`p-3.5 rounded border text-xs ${
                importResult.importedCount > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {importResult.importedCount > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
                <span>
                  {importResult.importedCount > 0
                    ? `Successfully imported ${importResult.importedCount} transactions!`
                    : 'Import completed with errors.'}
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                  {importResult.errors.slice(0, 5).map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* CSV File Upload & Paste Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                Paste CSV or Drop Broker Statement
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Choose .CSV File</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <textarea
              id="csv-textarea"
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Symbol,Type,Quantity,Price,Date&#10;RELIANCE,BUY,10,2900,2024-01-15&#10;TCS,BUY,5,4100,2024-02-01"
              className="w-full p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-csv-btn"
              type="button"
              onClick={handleImportSubmit}
              disabled={isProcessing || !csvContent.trim()}
              className="px-5 py-2 rounded text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isProcessing ? 'IMPORTING...' : 'IMPORT TRANSACTIONS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
