import { Router } from 'express';
import { dbManager } from '../db/dbManager';
import { marketDataService } from '../services/marketDataService';

export const healthRouter = Router();

// GET /api/health
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '3.0.0',
    service: 'Indian Stock Portfolio Tracker Backend (Supabase Ready)',
  });
});

// GET /api/health/database
healthRouter.get('/database', (req, res) => {
  res.json({
    status: 'ok',
    driver: 'Supabase Architecture Ready (In-Memory Isolation Store)',
    totalUsers: dbManager.users.size,
    totalPortfolios: dbManager.portfolios.size,
    totalTransactions: dbManager.transactions.size,
  });
});

// GET /api/health/market-data
healthRouter.get('/market-data', async (req, res) => {
  try {
    const testQuote = await marketDataService.getQuote('RELIANCE.NS');
    res.json({
      status: testQuote ? 'healthy' : 'degraded',
      provider: 'Real-time NSE/BSE Market Feed with Technicals',
      sampleQuote: testQuote
        ? {
            symbol: testQuote.symbol,
            price: testQuote.price,
            status: testQuote.status,
            timestamp: testQuote.timestamp,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});
