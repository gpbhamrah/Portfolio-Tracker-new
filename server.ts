import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import { dbManager } from './src/server/db/dbManager';
import { runAllCalculationTests } from './src/server/tests/calculations.test';
import { authRouter } from './src/server/routes/authRoutes';
import { portfolioRouter } from './src/server/routes/portfolioRoutes';
import { watchlistRouter } from './src/server/routes/watchlistRoutes';
import { alertRouter } from './src/server/routes/alertRoutes';
import { marketRouter } from './src/server/routes/marketRoutes';
import { userRouter } from './src/server/routes/userRoutes';
import { adminRouter } from './src/server/routes/adminRoutes';
import { healthRouter } from './src/server/routes/healthRoutes';
import { marketDataService } from './src/server/services/marketDataService';
import { calcRealEMA } from './src/server/services/calculations';

const app = express();
const PORT = 3000;

// Security & Parsing Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// 1. Mount Modular REST API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/portfolios', portfolioRouter);
app.use('/api/watchlists', watchlistRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/market', marketRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);

// 2. Compatibility Endpoints for existing frontend services
app.get('/api/market-data', async (req, res) => {
  try {
    const rawSymbols = ((req.query.symbols as string) || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawSymbols.length === 0) {
      return res.json({ quotes: {}, timestamp: Date.now() });
    }

    const quotes = await marketDataService.getBatchQuotes(rawSymbols);
    return res.json({ quotes, timestamp: Date.now() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, quotes: {} });
  }
});

app.get('/api/indices-data', async (req, res) => {
  try {
    const indexData = await marketDataService.getIndexData();
    return res.json({
      nifty: indexData.nifty,
      sectors: indexData.sectors,
      timestamp: Date.now(),
      status: 'success',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, nifty: null, sectors: [] });
  }
});

async function startServer() {
  // Initialize Database Manager and run calculation engine test verification
  try {
    await dbManager.initialize();
    runAllCalculationTests();
  } catch (err) {
    console.error('Initialization warning:', err);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Indian Stock Portfolio Tracker Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
