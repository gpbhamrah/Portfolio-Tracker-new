import { Request, Response, NextFunction } from 'express';
import { dbManager } from '../db/dbManager';
import { supabaseSessionMiddleware, SupabaseAuthRequest } from './supabaseAuth';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthenticatedRequest extends SupabaseAuthRequest {}

/**
 * Authentication Boundary Middleware
 * Automatically verifies & refreshes sessions via Supabase.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  return supabaseSessionMiddleware(req, res, next);
}

/**
 * Enforces authenticated user access
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !req.user.userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' },
    });
    return;
  }
  next();
}

/**
 * Enforces ADMIN role access
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Administrator privileges required for this resource.' },
    });
    return;
  }
  next();
}

/**
 * IDOR Protection: Verifies user owns the specified portfolio
 */
export async function verifyPortfolioOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const portfolioId = req.params.portfolioId || req.params.id;
    const userId = req.user?.userId;

    if (!portfolioId || !userId) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Portfolio identifier missing.' },
      });
      return;
    }

    const portfolio = await dbManager.getPortfolioById(portfolioId);
    if (!portfolio) {
      res.status(404).json({
        success: false,
        error: { code: 'PORTFOLIO_NOT_FOUND', message: 'Portfolio not found.' },
      });
      return;
    }

    if (portfolio.userId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'You do not have permission to access this portfolio.' },
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error('Portfolio ownership verification error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'VERIFICATION_ERROR', message: 'Failed to verify portfolio ownership' },
    });
  }
}
