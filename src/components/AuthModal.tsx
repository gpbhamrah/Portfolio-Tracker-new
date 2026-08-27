import React from 'react';
import { X, ShieldCheck, Database, KeyRound, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { AuthUser } from '../services/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold font-mono">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Supabase Authentication Migration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-User Architecture & Row Level Security (RLS)
              </p>
            </div>
          </div>
          <button
            id="close-auth-modal"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200">
                Legacy Custom Auth & Prisma Removed
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Custom password hashing, JWT secret keys, and Neon/Prisma dependencies have been completely purged from the codebase.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h5 className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Supabase Auth Architecture Ready
            </h5>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>auth.users Identity</strong>: User accounts managed exclusively by Supabase Auth
                </span>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>Zero Password Storage</strong>: Application code never touches raw or hashed passwords
                </span>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>Row Level Security (RLS)</strong>: True PostgreSQL level portfolio and transaction isolation
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="auth-continue-btn"
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition cursor-pointer"
            >
              Continue to Portfolio Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
