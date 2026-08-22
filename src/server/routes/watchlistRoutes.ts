import { Router } from 'express';
import { dbManager, DbWatchlist, DbWatchlistItem, DbInstrument } from '../db/dbManager';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { marketDataService } from '../services/marketDataService';

export const watchlistRouter = Router();
watchlistRouter.use(authenticateToken);

// GET /api/watchlists - List watchlists for user
watchlistRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  let userWatchlists = Array.from(dbManager.watchlists.values()).filter(
    (w) => w.userId === userId
  );

  if (userWatchlists.length === 0) {
    const defaultWlId = `wl-${userId}-${Date.now()}`;
    const newWl: DbWatchlist = {
      id: defaultWlId,
      userId,
      name: 'Primary Watchlist',
      description: 'Swing setups & dip candidates',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dbManager.watchlists.set(defaultWlId, newWl);
    userWatchlists = [newWl];
  }

  // Fetch items for the first/active watchlist
  const activeWl = userWatchlists[0];
  const rawItems = Array.from(dbManager.watchlistItems.values()).filter(
    (item) => item.watchlistId === activeWl.id
  );

  const symbolsToFetch = rawItems
    .map((item) => dbManager.instruments.get(item.instrumentId)?.symbol)
    .filter(Boolean) as string[];

  const quotes = await marketDataService.getBatchQuotes(symbolsToFetch);

  const items = rawItems.map((item) => {
    const inst = dbManager.instruments.get(item.instrumentId);
    const sym = inst?.symbol || 'UNKNOWN';
    const q = quotes[sym] || quotes[sym.replace('.NS', '')];

    const cmp = q?.price || inst?.lastPrice || item.targetEntryPrice || 0;
    const targetSell = item.targetSellPrice || (cmp ? Math.round(cmp * 1.2 * 100) / 100 : 0);
    const stopLoss = item.stopLoss || (cmp ? Math.round(cmp * 0.9 * 100) / 100 : 0);

    return {
      id: item.id,
      name: inst?.name || sym,
      ticker: sym.replace('.NS', '').replace('.BO', ''),
      sector: inst?.sector || 'General',
      targetEntryPrice: item.targetEntryPrice || cmp,
      cmp,
      dayChange: q?.change || 0,
      dayChangePercent: q?.changePercent || 0,
      targetSellPrice: targetSell,
      stopLoss,
      addedDate: item.addedDate.toISOString().slice(0, 10),
      notes: item.notes || '',
    };
  });

  res.json({
    success: true,
    data: {
      watchlists: userWatchlists,
      activeWatchlistId: activeWl.id,
      items,
    },
  });
});

// POST /api/watchlists/:id/items - Add item to watchlist
watchlistRouter.post('/:id/items', async (req: AuthenticatedRequest, res) => {
  try {
    const watchlistId = req.params.id;
    const { name, ticker, sector, targetEntryPrice, targetSellPrice, stopLoss, notes, addedDate } = req.body;

    if (!ticker) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TICKER', message: 'Ticker is required' },
      });
      return;
    }

    const cleanSym = ticker.trim().toUpperCase().endsWith('.NS')
      ? ticker.trim().toUpperCase()
      : `${ticker.trim().toUpperCase()}.NS`;

    let inst = dbManager.instruments.get(cleanSym) || dbManager.instruments.get(cleanSym.replace('.NS', ''));
    if (!inst) {
      const instId = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      inst = {
        id: instId,
        symbol: cleanSym,
        exchange: 'NSE',
        name: name || cleanSym.replace('.NS', ''),
        sector: sector || 'General',
        instrumentType: 'STOCK',
        currency: 'INR',
        isActive: true,
        dataStatus: 'fresh',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbManager.instruments.set(instId, inst);
      dbManager.instruments.set(cleanSym, inst);
    }

    const itemId = `wli-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newItem: DbWatchlistItem = {
      id: itemId,
      watchlistId,
      instrumentId: inst.id,
      targetEntryPrice: Number(targetEntryPrice) || null,
      targetSellPrice: Number(targetSellPrice) || null,
      stopLoss: Number(stopLoss) || null,
      notes: notes || null,
      addedDate: addedDate ? new Date(addedDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbManager.watchlistItems.set(itemId, newItem);

    res.status(201).json({
      success: true,
      data: {
        id: itemId,
        name: inst.name,
        ticker: inst.symbol.replace('.NS', ''),
        sector: inst.sector,
        targetEntryPrice: newItem.targetEntryPrice,
        targetSellPrice: newItem.targetSellPrice,
        stopLoss: newItem.stopLoss,
        notes: newItem.notes,
        addedDate: newItem.addedDate.toISOString().slice(0, 10),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'WATCHLIST_ERROR', message: err.message },
    });
  }
});

// DELETE /api/watchlists/:watchlistId/items/:itemId - Remove item from watchlist
watchlistRouter.delete('/:watchlistId/items/:itemId', (req: AuthenticatedRequest, res) => {
  const { itemId } = req.params;
  dbManager.watchlistItems.delete(itemId);
  res.json({
    success: true,
    data: { message: 'Watchlist item deleted' },
  });
});
