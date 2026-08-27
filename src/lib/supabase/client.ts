import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

let browserClientInstance: SupabaseClient | null = null;

/**
 * Creates or retrieves a singleton Supabase browser client for client-side React code.
 */
export function createClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  return browserClientInstance;
}

export const supabase = createClient();
