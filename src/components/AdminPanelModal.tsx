import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Users, Database, Activity, RefreshCw, CheckCircle2, UserX, UserCheck, UserPlus, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'logs'>('metrics');

  // New user creation state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Investor@1234');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [mRes, uRes, lRes] = await Promise.all([
        apiClient.getAdminMetrics(),
        apiClient.getAdminUsers(),
        apiClient.getAdminLogs(),
      ]);

      if (mRes.success) setMetrics(mRes.data);
      if (uRes.success) setUsers(uRes.data || []);
      if (lRes.success) setLogs(lRes.data || []);
    } catch (err) {
      console.error('Failed to load admin telemetry', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleUser = async (userId: string) => {
    try {
      const res = await apiClient.toggleUserStatus(userId);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
        );
      }
    } catch (err) {
      alert('Failed to toggle user status');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const res = await apiClient.createAdminUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
      });

      if (res.success && res.data) {
        setCreateSuccess(`User ${res.data.name} (${res.data.email}) created successfully!`);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('Investor@1234');
        setShowCreateUser(false);
        loadAdminData();
      } else {
        setCreateError(res.error?.message || 'Failed to create user');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-rose-600 flex items-center justify-center text-white font-bold font-mono">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Platform Admin & Telemetry Console
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System observability, user access control, and database cluster health
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              disabled={isLoading}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-mono">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-2 px-3 font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'metrics'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            System Metrics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-3 font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            User Directory ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2 px-3 font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Audit Logs ({logs.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Registered Users</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    {metrics?.totalUsers ?? '—'}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {metrics?.activeUsers ?? 0} active
                  </div>
                </div>

                <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Total Portfolios</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    {metrics?.totalPortfolios ?? '—'}
                  </div>
                </div>

                <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Total Transactions</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    {metrics?.totalTransactions ?? '—'}
                  </div>
                </div>

                <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Active Alerts</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    {metrics?.totalAlerts ?? '—'}
                  </div>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="p-4 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">DATABASE DRIVER:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{metrics?.databaseStatus}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">MARKET FEED STATUS:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{metrics?.marketDataStatus}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">SYSTEM UPTIME:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {metrics?.uptimeSeconds ? `${Math.floor(metrics.uptimeSeconds)} seconds` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Header with Create User button */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    Platform User Directory
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Manage active logins, roles, and create new investor accounts
                  </p>
                </div>
                <button
                  id="admin-new-user-toggle-btn"
                  type="button"
                  onClick={() => setShowCreateUser(!showCreateUser)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showCreateUser ? 'Cancel' : 'Create User'}</span>
                </button>
              </div>

              {/* Feedback messages */}
              {createSuccess && (
                <div className="flex items-center gap-2 p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{createSuccess}</span>
                </div>
              )}

              {createError && (
                <div className="flex items-center gap-2 p-3 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-mono text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Create User Form Drawer */}
              {showCreateUser && (
                <form
                  onSubmit={handleCreateUserSubmit}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    <span>Provision New Platform Account</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="admin-create-name"
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Ramesh Patel"
                        className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="admin-create-email"
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="investor@example.com"
                        className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                        Password *
                      </label>
                      <input
                        id="admin-create-password"
                        type="password"
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                        Platform Role
                      </label>
                      <select
                        id="admin-create-role"
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'USER' | 'ADMIN')}
                        className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                      >
                        <option value="USER">USER (Standard Portfolio)</option>
                        <option value="ADMIN">ADMIN (System Console Access)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      className="px-3 py-1.5 rounded text-xs font-mono border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="admin-create-submit-btn"
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer disabled:opacity-60"
                    >
                      {isCreatingUser ? 'Creating...' : 'Provision User'}
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Name / Email</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Joined</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                        <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                          <div>{u.name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              u.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">
                          {new Date(u.createdAt).toISOString().slice(0, 10)}
                        </td>
                        <td className="p-2.5 text-right">
                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleToggleUser(u.id)}
                              className="px-2 py-1 rounded text-[11px] font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              {u.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">[{log.action}]</span>
                    <span className="text-slate-700 dark:text-slate-300">{log.details || log.resource}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
