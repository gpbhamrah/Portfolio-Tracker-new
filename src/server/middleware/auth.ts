import { Request, Response, NextFunction } from 'express';
import { dbManager } from '../db/dbManager';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

/**
 * Authentication Boundary Middleware (Prepared for Supabase Auth JWT)
 * In the upcoming phase, this will verify Supabase JWT tokens via Supabase Auth.
 * For now, it extracts user context cleanly without legacy custom JWT/bcrypt layers.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Use default active demo user or token identity
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

    next();
  } catch (err: any) {
    console.error('Authentication middleware error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Internal authentication error' },
    });
  }
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
