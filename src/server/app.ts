import express from 'express';
import cors from 'cors';

import { portfolioRouter } from './routes/portfolioRoutes';
import { watchlistRouter } from './routes/watchlistRoutes';
import { alertRouter } from './routes/alertRoutes';
import { marketRouter } from './routes/marketRoutes';
import { userRouter } from './routes/userRoutes';
import { adminRouter } from './routes/adminRoutes';
import { healthRouter } from './routes/healthRoutes';
import { marketDataService } from './services/marketDataService';

const app = express();

// Security & Parsing Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins with credentials for preview URLs, custom domains, and localhost
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1. Mount Modular REST API Routes (Prepared for Supabase)
app.use('/api/health', healthRouter);
app.use('/api/portfolios', portfolioRouter);
app.use('/api/watchlists', watchlistRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/market', marketRouter);
app.use('/api/user', userRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);

// 2. Compatibility Endpoints for standalone market queries
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

// 3. API 404 Guard: Ensure unmapped /api/* endpoints return JSON instead of HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'API_ENDPOINT_NOT_FOUND',
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// 4. Global API Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server',
    },
  });
});

export default app;
