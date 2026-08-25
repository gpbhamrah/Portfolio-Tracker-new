import { Router } from 'express';
import { dbManager, DbWatchlist, DbWatchlistItem } from '../db/dbManager';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { marketDataService } from '../services/marketDataService';

export const watchlistRouter = Router();
watchlistRouter.use(authenticateToken);

// GET /api/watchlists - List watchlists for user
watchlistRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'WATCHLIST_FETCH_FAILED', message: err.message } });
  }
});

// POST /api/watchlists/:id/items - Add item to watchlist
watchlistRouter.post('/:id/items', async (req: AuthenticatedRequest, res) => {
  try {
    const watchlistId = req.params.id;
    const userId = req.user!.userId;
    const watchlist = dbManager.watchlists.get(watchlistId);

    if (!watchlist || (watchlist.userId !== userId && req.user?.role !== 'ADMIN')) {
      res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'You do not have permission to modify this watchlist.' },
      });
      return;
    }

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

    const inst = await dbManager.getOrUpsertInstrument(cleanSym, name, sector);

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
  const { watchlistId, itemId } = req.params;
  const userId = req.user!.userId;
  const watchlist = dbManager.watchlists.get(watchlistId);

  if (!watchlist || (watchlist.userId !== userId && req.user?.role !== 'ADMIN')) {
    res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'You do not have permission to modify this watchlist.' },
    });
    return;
  }

  const item = dbManager.watchlistItems.get(itemId);
  if (!item || item.watchlistId !== watchlistId) {
    res.status(404).json({
      success: false,
      error: { code: 'ITEM_NOT_FOUND', message: 'Watchlist item not found.' },
    });
    return;
  }

  dbManager.watchlistItems.delete(itemId);

  res.json({
    success: true,
    data: { message: 'Item removed from watchlist.' },
  });
});
