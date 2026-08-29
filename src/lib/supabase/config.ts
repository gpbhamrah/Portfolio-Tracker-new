// Supabase Configuration & Environment Resolution

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
    return String((import.meta as any).env[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return String(process.env[key]).trim();
  }
  return '';
};

const rawUrl =
  getEnv('VITE_SUPABASE_URL') ||
  getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnv('SUPABASE_URL');

const rawKey =
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_PUBLISHABLE_KEY');

// Normalize project URL: strip trailing slashes or accidentally appended /rest/v1 paths
export const SUPABASE_URL = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : '';
export const SUPABASE_PUBLISHABLE_KEY = rawKey || '';

export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
