import React, { useState, useEffect } from 'react';
import { X, Bell, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertsUpdated?: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ isOpen, onClose, onAlertsUpdated }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications'>('alerts');
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [conditionType, setConditionType] = useState('PRICE_ABOVE');
  const [conditionValue, setConditionValue] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const [aRes, nRes] = await Promise.all([apiClient.getAlerts(), apiClient.getNotifications()]);
      if (aRes.success) setAlerts(aRes.data || []);
      if (nRes.success) setNotifications(nRes.data || []);
    } catch (err) {
      console.error('Failed to load alerts', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !conditionValue) return;

    try {
      const res = await apiClient.createAlert({
        symbol: symbol.toUpperCase(),
        conditionType,
        conditionValue: Number(conditionValue),
        notes,
      });

      if (res.success) {
        setIsCreating(false);
        setSymbol('');
        setConditionValue('');
        setNotes('');
        loadData();
        onAlertsUpdated?.();
      }
    } catch (err) {
      alert('Failed to create alert');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await apiClient.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      onAlertsUpdated?.();
    } catch (err) {
      alert('Failed to delete alert');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-white font-bold font-mono">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Alerts & Live Price Triggers
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target prices, stop losses, and indicator triggers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-mono">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`pb-2 px-1 font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'alerts'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Active Triggers ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-2 px-1 font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'notifications'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Notifications ({notifications.filter((n) => !n.isRead).length} new)
            </button>
          </div>

          {activeTab === 'alerts' && !isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="mb-1.5 flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Create Trigger</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'alerts' && (
            <>
              {isCreating && (
                <form
                  onSubmit={handleCreateAlert}
                  className="p-4 rounded border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3 mb-4 text-xs font-mono"
                >
                  <div className="font-bold text-slate-900 dark:text-white">New Price Alert</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Stock Ticker</label>
                      <input
                        type="text"
                        required
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        placeholder="e.g. RELIANCE"
                        className="w-full p-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Condition</label>
                      <select
                        value={conditionType}
                        onChange={(e) => setConditionType(e.target.value)}
                        className="w-full p-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="PRICE_ABOVE">Price Above Target (₹)</option>
                        <option value="PRICE_BELOW">Price Below Stop Loss (₹)</option>
                        <option value="50_EMA_BREAKOUT">Cross Above 50 EMA</option>
                        <option value="200_EMA_BREAKOUT">Cross Above 200 EMA</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Trigger Price Level (₹)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={conditionValue}
                      onChange={(e) => setConditionValue(e.target.value)}
                      placeholder="e.g. 3000.00"
                      className="w-full p-2 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                    >
                      Save Alert
                    </button>
                  </div>
                </form>
              )}

              {alerts.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  No active alerts created. Click "Create Trigger" to set up price targets or stop loss notifications.
                </div>
              ) : (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{alt.symbol}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {alt.conditionType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Target level: <span className="font-bold text-slate-800 dark:text-slate-200">₹{alt.conditionValue}</span>
                        {alt.notes && <span className="ml-2 italic opacity-80">({alt.notes})</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alt.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  No notifications recorded.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded border text-xs font-mono flex items-start justify-between gap-3 ${
                      n.isRead
                        ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                        : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 text-slate-900 dark:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{n.title}</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.sentAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer whitespace-nowrap"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
