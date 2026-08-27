// Supabase Configuration & Fallbacks

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  return undefined;
};

export const SUPABASE_URL =
  getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnv('VITE_SUPABASE_URL') ||
  getEnv('SUPABASE_URL') ||
  'https://dkdasovezlnjaaywzjqm.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  'sb_publishable_5VEiqEfj8czqUTkChQ7PXg_J75Z3CCR';

export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_PUBLISHABLE_KEY;
