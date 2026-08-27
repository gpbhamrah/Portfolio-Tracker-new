import React, { useState } from 'react';
import { X, User, Trash2, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient, AuthUser } from '../services/apiClient';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onUserLoggedOut: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserLoggedOut,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiClient.deleteAccount();
      if (res.success) {
        onUserLoggedOut();
        onClose();
      } else {
        setDeleteError(res.error?.message || 'Failed to delete account');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              Account Profile & Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* User Overview */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {user.name}
              </div>
              <div className="text-xs font-mono text-slate-500">{user.email}</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                user.role === 'ADMIN'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {user.role}
            </span>
          </div>

          {/* Supabase Auth Note */}
          <div className="p-3.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 font-mono">Authentication Identity</span>
              <p className="text-indigo-700 dark:text-indigo-300 mt-0.5">
                Passwords and security credentials are no longer stored in the application database. In the next phase, credentials are authenticated directly with Supabase Auth.
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-700 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
              <span>Danger Zone: Delete Account</span>
            </div>
            <p className="text-[11px] font-mono text-rose-600/80 dark:text-rose-400/80">
              Permanently purge your account, saved portfolios, and transaction logs.
            </p>

            {deleteError && (
              <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold text-white transition cursor-pointer ${
                  confirmDelete
                    ? 'bg-rose-700 hover:bg-rose-800 animate-pulse'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isDeleting
                  ? 'Deleting...'
                  : confirmDelete
                  ? 'Confirm Permanent Deletion'
                  : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
