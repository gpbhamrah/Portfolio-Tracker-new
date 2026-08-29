import React, { useState } from 'react';
import { UserPlus, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

interface SignUpProps {
  onToggleSignIn?: () => void;
  onSuccess?: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onToggleSignIn, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setRequiresConfirmation(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(
        'Supabase authentication is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Automatic session established (email confirmation disabled in Supabase)
        setSuccessMessage('Account created and signed in successfully!');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 800);
      } else if (data?.user) {
        // Email confirmation is required by Supabase project settings
        setRequiresConfirmation(true);
        setSuccessMessage(
          'Registration initiated! A verification link has been sent to your email address. Please check your inbox and confirm your account before signing in.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="signup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-medium text-slate-700 dark:text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="signup-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        <button
          id="signup-submit-btn"
          type="submit"
          disabled={loading || requiresConfirmation}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
        </button>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-md font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 p-3 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-md font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1.5">
              <p>{successMessage}</p>
              {requiresConfirmation && onToggleSignIn && (
                <button
                  type="button"
                  onClick={onToggleSignIn}
                  className="inline-block mt-1 font-bold text-emerald-800 dark:text-emerald-200 underline cursor-pointer"
                >
                  Go to Sign In &rarr;
                </button>
              )}
            </div>
          </div>
        )}
      </form>

      {onToggleSignIn && (
        <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onToggleSignIn}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
};
