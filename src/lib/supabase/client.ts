import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, isSupabaseConfigured } from './config';

let browserClientInstance: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase browser client for client-side React code.
 */
export function createClient(): SupabaseClient {
  const url = SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const key = SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

  if (typeof window === 'undefined') {
    return createBrowserClient(url, key);
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(url, key);
  }

  return browserClientInstance;
}

export const supabase = createClient();
export { isSupabaseConfigured };
