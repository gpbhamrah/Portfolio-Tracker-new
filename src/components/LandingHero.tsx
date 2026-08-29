import React from 'react';
import { LogIn, UserPlus, TrendingUp, ShieldCheck, Activity, PieChart, Database, Lock } from 'lucide-react';

interface LandingHeroProps {
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenSignIn,
  onOpenSignUp,
}) => {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 space-y-12">
      {/* Top Banner / Hero Section */}
      <div className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-medium">
          <Activity className="w-3.5 h-3.5" />
          <span>Real-time NSE Analytics & FIFO Portfolio Engine</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Institutional Equity Portfolio &<br className="hidden sm:inline" /> Sector Momentum Engine
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
          Track multi-broker Indian equity holdings, monitor real-time 50-day EMA sector rotations, compute compliant FIFO realized capital gains, and keep your data securely synced to the cloud.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            id="hero-signin-btn"
            onClick={onOpenSignIn}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-indigo-500/20 transition cursor-pointer font-mono"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Portfolio</span>
          </button>

          <button
            id="hero-signup-btn"
            onClick={onOpenSignUp}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold text-xs uppercase tracking-wider shadow-xs transition cursor-pointer font-mono"
          >
            <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Create Free Account</span>
          </button>
        </div>
      </div>

      {/* Feature Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="w-8 h-8 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
            NSE Live Pricing
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            Real-time quotes for NSE equities and benchmark indices with 20/50/200 EMA trend indicators.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="w-8 h-8 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
            50-EMA Sector Rotation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            Mathematical 50-day EMA diagnostic across 13 major sectors to identify institutional inflows.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="w-8 h-8 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <PieChart className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
            FIFO Capital Gains
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            Compliant lot-matching FIFO calculation for STCG and LTCG tax reporting and analytics.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="w-8 h-8 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
            Zero-Knowledge Cloud
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            Your portfolio records are protected with user-isolated authentication and cloud storage.
          </p>
        </div>
      </div>

      {/* Security & Access Banner */}
      <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
              Private & Authenticated Workspace
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Sign in to view your active holdings, track live buy/sell triggers, and access sectoral heatmaps.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenSignIn}
          className="shrink-0 text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
        >
          <span>ACCESS YOUR DASHBOARD</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
};
