import { Router } from 'express';
import { marketDataService } from '../services/marketDataService';
import { calculateAllEMAs, calculateRSI, calculateMACD } from '../services/calculations';

export const marketRouter = Router();

// GET /api/market/quotes?symbols=RELIANCE,TCS,INFY
marketRouter.get('/quotes', async (req, res) => {
  try {
    const rawSymbols = req.query.symbols as string;
    if (!rawSymbols) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_SYMBOLS', message: 'Query parameter "symbols" is required' },
      });
      return;
    }

    const symbols = rawSymbols.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const quotes = await marketDataService.getBatchQuotes(symbols);

    res.json({
      success: true,
      data: quotes,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'MARKET_DATA_ERROR', message: err.message },
    });
  }
});

// GET /api/market/indices - Benchmark (Nifty 50) + Sector indices
marketRouter.get('/indices', async (req, res) => {
  try {
    const data = await marketDataService.getIndexData();
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INDEX_DATA_ERROR', message: err.message },
    });
  }
});

// GET /api/market/history/:symbol?range=1y
marketRouter.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const range = (req.query.range as string) || '1y';

    const candles = await marketDataService.getHistoricalPrices(symbol, range);
    const closes = candles.map((c) => c.close);
    const emas = calculateAllEMAs(closes);
    const rsi14 = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        range,
        candles,
        technicals: {
          ...emas,
          rsi14,
          macd,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_FETCH_ERROR', message: err.message },
    });
  }
});

// GET /api/market/search?q=tata
marketRouter.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.json({ success: true, data: [] });
      return;
    }

    const results = await marketDataService.searchInstruments(query);
    res.json({
      success: true,
      data: results,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_ERROR', message: err.message },
    });
  }
});
