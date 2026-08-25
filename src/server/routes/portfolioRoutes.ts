import { Router } from 'express';
import { dbManager, DbPortfolio, DbTransaction } from '../db/dbManager';
import { authenticateToken, verifyPortfolioOwnership, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest, TransactionSchema } from '../middleware/validation';
import { portfolioEngine } from '../services/portfolioEngine';
import { marketDataService } from '../services/marketDataService';

export const portfolioRouter = Router();

// Apply auth to all portfolio routes
portfolioRouter.use(authenticateToken);

// GET /api/portfolios - List all portfolios for the authenticated user
portfolioRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const userPortfolios = await dbManager.getPortfolios(userId);

    res.json({
      success: true,
      data: userPortfolios,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'PORTFOLIO_FETCH_FAILED', message: err.message },
    });
  }
});

// POST /api/portfolios - Create new portfolio
portfolioRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { name, description, baseCurrency = 'INR' } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Portfolio name is required' },
      });
      return;
    }

    const newId = `port-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const portfolio: DbPortfolio = {
      id: newId,
      userId,
      name: name.trim(),
      description: description?.trim() || null,
      baseCurrency,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await dbManager.createPortfolio(portfolio);

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'PORTFOLIO_CREATION_FAILED', message: err.message },
    });
  }
});

// GET /api/portfolios/:id/summary - Comprehensive calculated portfolio summary
portfolioRouter.get('/:id/summary', verifyPortfolioOwnership, async (req: AuthenticatedRequest, res) => {
  try {
    const portfolioId = req.params.id;
    const summary = await portfolioEngine.getPortfolioSummary(req.user!.userId, portfolioId);

    if (!summary) {
      res.status(404).json({
        success: false,
        error: { code: 'PORTFOLIO_NOT_FOUND', message: 'Portfolio not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CALCULATION_ERROR', message: err.message || 'Failed to compute portfolio metrics' },
    });
  }
});

// GET /api/portfolios/:id/transactions - List all transactions
portfolioRouter.get('/:id/transactions', verifyPortfolioOwnership, async (req: AuthenticatedRequest, res) => {
  try {
    const portfolioId = req.params.id;
    const transactions = await dbManager.getTransactions(portfolioId, req.user!.userId);

    // Join instrument symbol/name
    const enriched = transactions.map((tx) => {
      const inst = dbManager.instruments.get(tx.instrumentId);
      return {
        ...tx,
        symbol: inst?.symbol || 'UNKNOWN',
        name: inst?.name || inst?.symbol || 'Unknown Security',
        sector: inst?.sector || 'General',
      };
    });

    res.json({
      success: true,
      data: enriched,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'TRANSACTIONS_FETCH_FAILED', message: err.message },
    });
  }
});

// POST /api/portfolios/:id/transactions - Add new transaction
portfolioRouter.post(
  '/:id/transactions',
  verifyPortfolioOwnership,
  validateRequest(TransactionSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const portfolioId = req.params.id;
      const userId = req.user!.userId;
      const { symbol, name, sector, type, quantity, price, brokerage = 0, taxes = 0, otherCharges = 0, date, notes } = req.body;

      const cleanSym = symbol.trim().toUpperCase().endsWith('.NS')
        ? symbol.trim().toUpperCase()
        : `${symbol.trim().toUpperCase()}.NS`;

      // Find or create instrument in Master
      const inst = await dbManager.getOrUpsertInstrument(cleanSym, name, sector);

      const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
      const txDate = date ? new Date(date) : new Date();

      const newTx: DbTransaction = {
        id: txId,
        userId,
        portfolioId,
        instrumentId: inst.id,
        transactionType: type,
        quantity,
        price,
        brokerage,
        taxes,
        otherCharges,
        transactionDate: txDate,
        notes: notes?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdTx = await dbManager.createTransaction(newTx);

      // Recompute and fetch latest quote in background
      marketDataService.getQuote(cleanSym).catch(() => {});

      res.status(201).json({
        success: true,
        data: {
          ...createdTx,
          symbol: inst.symbol,
          name: inst.name,
        },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'TRANSACTION_CREATION_FAILED', message: err.message },
      });
    }
  }
);

// DELETE /api/portfolios/:portfolioId/transactions/:txId - Delete a transaction
portfolioRouter.delete('/:portfolioId/transactions/:txId', verifyPortfolioOwnership, async (req: AuthenticatedRequest, res) => {
  try {
    const { txId } = req.params;
    await dbManager.deleteTransaction(txId);

    res.json({
      success: true,
      data: { message: 'Transaction deleted successfully' },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_TRANSACTION_FAILED', message: err.message },
    });
  }
});

// POST /api/portfolios/:id/import-csv - Broker statement CSV import
portfolioRouter.post('/:id/import-csv', verifyPortfolioOwnership, async (req: AuthenticatedRequest, res) => {
  try {
    const portfolioId = req.params.id;
    const { csvContent } = req.body;

    if (!csvContent || typeof csvContent !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CSV', message: 'CSV content string is required' },
      });
      return;
    }

    const result = await portfolioEngine.importBrokerCSV(req.user!.userId, portfolioId, csvContent);

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'IMPORT_ERROR', message: err.message },
    });
  }
});
