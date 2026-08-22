import { Request, Response, NextFunction } from 'express';
import { authService, AuthTokenPayload } from '../services/authService';
import { dbManager } from '../db/dbManager';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

/**
 * Validates JWT token from Authorization Header or HTTP cookie
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || req.cookies?.token;

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' },
    });
    return;
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token. Please log in again.' },
    });
    return;
  }

  // Check if user is active in DB
  const user = dbManager.users.get(payload.userId);
  if (!user || !user.isActive) {
    res.status(403).json({
      success: false,
      error: { code: 'ACCOUNT_DISABLED', message: 'User account has been suspended or removed.' },
    });
    return;
  }

  req.user = payload;
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
export function verifyPortfolioOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const portfolioId = req.params.portfolioId || req.params.id;
  const userId = req.user?.userId;

  if (!portfolioId || !userId) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Portfolio identifier missing.' },
    });
    return;
  }

  const portfolio = dbManager.portfolios.get(portfolioId);
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
}
