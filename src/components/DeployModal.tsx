import React, { useState } from 'react';
import { X, Github, ExternalLink, Copy, Check, Terminal, Globe, Rocket, ShieldCheck } from 'lucide-react';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const gitCommands = `# 1. Initialize git & commit files
git init
git add .
git commit -m "feat: fast personal portfolio tracker with date persistence & live CMP"

# 2. Add your GitHub repository as remote
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main`;

  const handleCopy = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 rounded-lg max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-800 transition-colors max-h-[90vh] overflow-y-auto font-mono">
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-slate-800 text-white flex items-center justify-center border border-slate-700">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight">
                Deploy Live on Vercel via GitHub
              </h3>
              <p className="text-xs text-slate-400">
                Pre-configured with <code className="text-indigo-400">vercel.json</code> SPA routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Step 1: Push to GitHub */}
          <div className="p-4 rounded border border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider text-[11px]">
                <span className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Push your Code to GitHub</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED!' : 'COPY COMMANDS'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2 font-sans">
              Create a new repository on <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-indigo-400 underline">GitHub.com</a>, then run in your terminal:
            </p>
            <pre className="bg-slate-950 text-slate-200 p-3 rounded border border-slate-800 font-mono text-[11px] overflow-x-auto select-all leading-relaxed">
              {gitCommands}
            </pre>
          </div>

          {/* Step 2: Import in Vercel */}
          <div className="p-4 rounded border border-slate-800 bg-slate-950/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider text-[11px]">
              <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Import to Vercel (1-Click Deploy)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 ml-1 leading-relaxed font-sans">
              <li>
                Visit <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-indigo-400 font-semibold underline">vercel.com/new</a> and connect your GitHub.
              </li>
              <li>
                Click <strong className="text-white">"Import"</strong> next to your portfolio repository.
              </li>
              <li>
                Framework preset: <strong className="text-white">Vite</strong> (preset ready in <code className="text-indigo-400">vercel.json</code>).
              </li>
              <li>
                Click <strong className="text-emerald-400 font-semibold">"Deploy"</strong> — live in ~30 seconds on a custom <code className="text-indigo-400">*.vercel.app</code> URL.
              </li>
            </ol>
          </div>

          {/* Step 3: Production Live Features */}
          <div className="p-3.5 rounded border border-emerald-900 bg-emerald-950/30 text-xs text-emerald-300 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Production Fast Engine & Persistence Active</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              On Vercel, the tracker operates with parallel Yahoo Finance quotes, localStorage date persistence, and instant export/import backups.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            GOT IT
          </button>
          <a
            href="https://vercel.com/new"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2 rounded text-xs font-bold bg-white text-slate-950 hover:bg-slate-200 transition shadow-md"
          >
            <span>OPEN VERCEL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

