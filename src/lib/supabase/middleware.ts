import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

/**
 * Updates / refreshes the Supabase Auth session on incoming requests.
 */
export async function updateSession(req: any, res?: any) {
  let supabaseResponse = res || {
    cookie: () => {},
  };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        if (req.cookies && typeof req.cookies === 'object') {
          return Object.entries(req.cookies).map(([name, value]) => ({
            name,
            value: String(value),
          }));
        }
        if (req.headers && req.headers.cookie) {
          return (req.headers.cookie as string).split(';').map((c) => {
            const [name, ...rest] = c.trim().split('=');
            return {
              name,
              value: decodeURIComponent(rest.join('=')),
            };
          });
        }
        return [];
      },
      setAll(cookiesToSet) {
        if (res && typeof res.cookie === 'function') {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookie(name, value, options);
          });
        }
      },
    },
  });

  // Calling getUser refreshes the session token if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, response: supabaseResponse };
}
