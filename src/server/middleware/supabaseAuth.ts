import { Request, Response, NextFunction } from 'express';
import { createServerClient } from '@supabase/ssr';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../lib/supabase/config';
import { dbManager } from '../db/dbManager';

export interface SupabaseAuthRequest extends Request {
  supabase?: SupabaseClient;
  supabaseUser?: User | null;
  user?: {
    userId: string;
    email: string;
    role: 'USER' | 'ADMIN';
  };
}

/**
 * Express Middleware: Refreshes Supabase session & extracts authenticated user
 */
export async function supabaseSessionMiddleware(
  req: SupabaseAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll() {
          if ((req as any).cookies && typeof (req as any).cookies === 'object') {
            return Object.entries((req as any).cookies).map(([name, value]) => ({
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

    req.supabase = supabase;

    // Check Bearer token first
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let user: User | null = null;

    if (bearerToken) {
      const { data } = await supabase.auth.getUser(bearerToken);
      user = data.user;
    } else {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    req.supabaseUser = user;

    if (user) {
      req.user = {
        userId: user.id,
        email: user.email || '',
        role: (user.user_metadata?.role as 'USER' | 'ADMIN') || 'USER',
      };
    } else {
      // Fallback demo user for smooth local preview & testing
      const defaultUser = Array.from(dbManager.users.values())[0] || {
        id: 'usr-demo-investor',
        email: 'demo@investingjournal.com',
        role: 'ADMIN' as const,
      };

      req.user = {
        userId: defaultUser.id,
        email: defaultUser.email,
        role: defaultUser.role,
      };
    }

    next();
  } catch (err) {
    console.error('Supabase session refresh middleware error:', err);
    next();
  }
}
