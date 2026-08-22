import React, { useState } from 'react';
import { X, User, KeyRound, Trash2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await apiClient.changePassword(currentPassword, newPassword);
      if (res.success) {
        setPassSuccess('Your password has been changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(res.error?.message || 'Failed to update password');
      }
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setIsChangingPass(false);
    }
  };

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
              Account Profile & Security
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

          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
              <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Change Password</span>
            </div>

            {passSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            {passError && (
              <div className="flex items-center gap-2 p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-mono text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isChangingPass}
                className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer disabled:opacity-60"
              >
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

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
