import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import type { User, Session } from '@supabase/supabase-js';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User, session: Session) => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [signInSuccessNotice, setSignInSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSwitchToSignIn = (email?: string, notice?: string) => {
    if (email) {
      setPrefilledEmail(email);
    }
    if (notice) {
      setSignInSuccessNotice(notice);
    }
    setMode('signin');
  };

  const handleSwitchToSignUp = () => {
    setSignInSuccessNotice(null);
    setMode('signup');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold font-mono">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === 'signin' && 'Sign In to Portfolio'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Account Recovery'}
                {mode === 'reset' && 'Reset Password'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supabase Authentication & Row Level Security
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

        {/* Tab Switcher - only show for signin/signup */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => handleSwitchToSignIn()}
              className={`flex-1 py-1.5 text-xs font-mono font-bold rounded transition cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={handleSwitchToSignUp}
              className={`flex-1 py-1.5 text-xs font-mono font-bold rounded transition cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              SIGN UP
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {mode === 'signin' && (
            <SignIn
              initialEmail={prefilledEmail}
              successMessage={signInSuccessNotice}
              onToggleSignUp={handleSwitchToSignUp}
              onForgotPassword={() => setMode('forgot')}
              onSuccess={(user, session) => {
                if (onSuccess) {
                  onSuccess(user, session);
                }
                onClose();
              }}
            />
          )}

          {mode === 'signup' && (
            <SignUp
              onToggleSignIn={handleSwitchToSignIn}
              onSuccess={(createdEmail) => {
                handleSwitchToSignIn(
                  createdEmail,
                  'Your account has been created. Please check your email and verify your address before logging in.'
                );
              }}
            />
          )}

          {mode === 'forgot' && (
            <ForgotPassword onBackToSignIn={() => setMode('signin')} />
          )}

          {mode === 'reset' && (
            <ResetPassword
              onSuccess={onClose}
              onBackToSignIn={() => setMode('signin')}
            />
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted Supabase Session & Strict Data Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
