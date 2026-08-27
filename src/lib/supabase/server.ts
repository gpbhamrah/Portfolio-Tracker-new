import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

export interface CookieItem {
  name: string;
  value: string;
}

export interface CookieStoreInterface {
  get?: (name: string) => string | undefined;
  getAll?: () => CookieItem[] | Record<string, string>;
  set?: (name: string, value: string, options?: CookieOptions) => void;
  setAll?: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => void;
  remove?: (name: string, options?: CookieOptions) => void;
}

/**
 * Creates a server-side Supabase client for SSR or API route handling.
 */
export function createClient(cookieStore?: CookieStoreInterface) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        if (!cookieStore) return [];
        if (typeof cookieStore.getAll === 'function') {
          const all = cookieStore.getAll();
          if (Array.isArray(all)) return all;
          return Object.entries(all).map(([name, value]) => ({ name, value }));
        }
        return [];
      },
      setAll(cookiesToSet) {
        if (!cookieStore) return;
        if (typeof cookieStore.setAll === 'function') {
          cookieStore.setAll(cookiesToSet);
        } else if (typeof cookieStore.set === 'function') {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set!(name, value, options);
          });
        }
      },
    },
  });
}
