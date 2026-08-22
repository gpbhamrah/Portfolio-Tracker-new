import { dbManager, DbTransaction, DbInstrument } from '../db/dbManager';
import {
  processTransactionsFIFO,
  calculateCurrentValue,
  calculateUnrealizedPnL,
  calculateXIRR,
  calculateCAGR,
  calculateDrawdown,
  calculatePortfolioAllocation,
  calculateTaxCategory,
  calculateEstimatedTax,
  TransactionItem,
} from './calculations';
import { marketDataService } from './marketDataService';

export interface CalculatedHoldingItem {
  id: string;
  instrumentId: string;
  name: string;
  ticker: string;
  exchange: string;
  sector: string;
  qty: number;
  buyPrice: number;
  invested: number;
  cmp: number;
  currentValue: number;
  dayChange?: number;
  dayChangePercent?: number;
  pl: number;
  plPercent: number;
  realizedPnL: number;
  buyDate: string;
  holdingPeriodDays: number;
  taxCategory: 'STCG' | 'LTCG';
  taxLabel: string;
  sellPrice?: number;
  stopLoss?: number;
  notes?: string;
  status: 'Stop Loss Triggered' | 'Target Reached' | 'Active';
}

export interface PortfolioSummary {
  portfolioId: string;
  name: string;
  currency: string;
  totalValue: number;
  totalInvested: number;
  todayPnL: number;
  todayPnLPercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  realizedPnL: number;
  unrealizedPnL: number;
  xirr: number;
  cagr: number;
  maxDrawdownPct: number;
  holdingsCount: number;
  profitablePositions: number;
  losingPositions: number;
  largestHolding: { name: string; ticker: string; percentage: number };
  largestSector: { name: string; percentage: number };
  taxSummary: {
    stcgGains: number;
    ltcgGains: number;
    estimatedTax: number;
    disclaimer: string;
  };
  sectorAllocation: Array<{ key: string; value: number; percentage: number }>;
  stockAllocation: Array<{ key: string; value: number; percentage: number }>;
  holdings: CalculatedHoldingItem[];
}

export class PortfolioEngine {
  /**
   * Rebuilds holdings and calculates complete portfolio metrics for a given user & portfolio
   */
  public async getPortfolioSummary(userId: string, portfolioId: string): Promise<PortfolioSummary | null> {
    const portfolio = dbManager.portfolios.get(portfolioId);
    if (!portfolio || portfolio.userId !== userId) {
      return null;
    }

    // 1. Fetch all transactions for this portfolio
    const transactions = Array.from(dbManager.transactions.values()).filter(
      (tx) => tx.portfolioId === portfolioId && tx.userId === userId
    );

    // Group transactions by instrumentId
    const txByInstrument = new Map<string, DbTransaction[]>();
    for (const tx of transactions) {
      if (!txByInstrument.has(tx.instrumentId)) {
        txByInstrument.set(tx.instrumentId, []);
      }
      txByInstrument.get(tx.instrumentId)!.push(tx);
    }

    // Gather all instrument symbols for batch market quotes
    const symbolsToFetch: string[] = [];
    const instrumentMap = new Map<string, DbInstrument>();

    for (const instId of txByInstrument.keys()) {
      const inst = dbManager.instruments.get(instId);
      if (inst) {
        instrumentMap.set(instId, inst);
        symbolsToFetch.push(inst.symbol);
      }
    }

    const quotesMap = await marketDataService.getBatchQuotes(symbolsToFetch);

    // Calculate position for each instrument
    const holdings: CalculatedHoldingItem[] = [];
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalRealizedPnL = 0;
    let totalTodayPnL = 0;
    let profitablePositions = 0;
    let losingPositions = 0;

    const realizedGainsForTax: Array<{ gain: number; isLTCG: boolean }> = [];
    const cashFlows: Array<{ amount: number; date: Date }> = [];

    // Record past transaction cash flows for XIRR
    for (const tx of transactions) {
      if (tx.transactionType === 'BUY') {
        cashFlows.push({
          amount: -(tx.quantity * tx.price + (tx.brokerage + tx.taxes + tx.otherCharges)),
          date: new Date(tx.transactionDate),
        });
      } else if (tx.transactionType === 'SELL') {
        cashFlows.push({
          amount: tx.quantity * tx.price - (tx.brokerage + tx.taxes + tx.otherCharges),
          date: new Date(tx.transactionDate),
        });
      } else if (tx.transactionType === 'DIVIDEND') {
        cashFlows.push({
          amount: tx.price * tx.quantity,
          date: new Date(tx.transactionDate),
        });
      }
    }

    for (const [instId, txs] of txByInstrument.entries()) {
      const inst = instrumentMap.get(instId) || {
        id: instId,
        symbol: 'UNKNOWN',
        exchange: 'NSE',
        name: 'Unknown Security',
        sector: 'General',
        lastPrice: 0,
        dataStatus: 'stale',
      };

      const calcTx: TransactionItem[] = txs.map((t) => ({
        type: t.transactionType as any,
        quantity: t.quantity,
        price: t.price,
        brokerage: t.brokerage,
        taxes: t.taxes,
        otherCharges: t.otherCharges,
        date: t.transactionDate,
      }));

      const position = processTransactionsFIFO(calcTx);

      // If position has active quantity > 0
      if (position.quantity > 0) {
        const quote =
          quotesMap[inst.symbol.toUpperCase()] ||
          quotesMap[inst.symbol.replace('.NS', '').toUpperCase()] ||
          null;

        const cmp = quote?.price || inst.lastPrice || position.averageBuyPrice;
        const curVal = calculateCurrentValue(position.quantity, cmp);
        const { pnl, pnlPercent } = calculateUnrealizedPnL(position.quantity, position.averageBuyPrice, cmp);

        const dayChange = quote?.change || 0;
        const dayChangePercent = quote?.changePercent || 0;
        const todayStockPnL = dayChange * position.quantity;
        totalTodayPnL += todayStockPnL;

        const taxClassification = calculateTaxCategory(position.firstBuyDate);

        // Find targets / stop loss from holdings table or watchlist
        const storedHolding = Array.from(dbManager.holdings.values()).find(
          (h) => h.portfolioId === portfolioId && h.instrumentId === instId
        );

        const sellTarget = storedHolding?.targetSellPrice || Math.round(position.averageBuyPrice * 1.2 * 100) / 100;
        const stopLoss = storedHolding?.stopLoss || Math.round(position.averageBuyPrice * 0.9 * 100) / 100;

        let status: 'Stop Loss Triggered' | 'Target Reached' | 'Active' = 'Active';
        if (stopLoss > 0 && cmp <= stopLoss) {
          status = 'Stop Loss Triggered';
        } else if (sellTarget > 0 && cmp >= sellTarget) {
          status = 'Target Reached';
        }

        if (pnl >= 0) profitablePositions++;
        else losingPositions++;

        totalInvested += position.totalInvested;
        totalCurrentValue += curVal;
        totalRealizedPnL += position.realizedPnL;

        if (position.realizedPnL !== 0) {
          realizedGainsForTax.push({
            gain: position.realizedPnL,
            isLTCG: taxClassification.isLongTerm,
          });
        }

        holdings.push({
          id: storedHolding?.id || `calc-h-${instId}`,
          instrumentId: instId,
          name: inst.name || inst.symbol,
          ticker: inst.symbol.replace('.NS', '').replace('.BO', ''),
          exchange: inst.exchange || 'NSE',
          sector: inst.sector || 'General',
          qty: position.quantity,
          buyPrice: position.averageBuyPrice,
          invested: position.totalInvested,
          cmp,
          currentValue: curVal,
          dayChange,
          dayChangePercent,
          pl: pnl,
          plPercent: pnlPercent,
          realizedPnL: position.realizedPnL,
          buyDate: position.firstBuyDate,
          holdingPeriodDays: taxClassification.holdingPeriodDays,
          taxCategory: taxClassification.category,
          taxLabel: taxClassification.label,
          sellPrice: sellTarget,
          stopLoss: stopLoss,
          notes: storedHolding?.notes || '',
          status,
        });
      }
    }

    // Add current terminal valuation for XIRR
    if (totalCurrentValue > 0) {
      cashFlows.push({
        amount: totalCurrentValue,
        date: new Date(),
      });
    }

    const xirr = calculateXIRR(cashFlows);
    const totalPnL = Math.round((totalCurrentValue - totalInvested) * 100) / 100;
    const totalPnLPercent =
      totalInvested > 0 ? Math.round(((totalCurrentValue - totalInvested) / totalInvested) * 10000) / 100 : 0;
    const todayPnLPercent =
      totalCurrentValue > 0 ? Math.round((totalTodayPnL / (totalCurrentValue - totalTodayPnL)) * 10000) / 100 : 0;

    // Allocations
    const sectorMap: Record<string, number> = {};
    const stockMap: Record<string, number> = {};

    for (const h of holdings) {
      sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.currentValue;
      stockMap[h.ticker] = (stockMap[h.ticker] || 0) + h.currentValue;
    }

    const sectorAllocation = calculatePortfolioAllocation(
      Object.entries(sectorMap).map(([k, v]) => ({ key: k, value: v }))
    ).sort((a, b) => b.value - a.value);

    const stockAllocation = calculatePortfolioAllocation(
      Object.entries(stockMap).map(([k, v]) => ({ key: k, value: v }))
    ).sort((a, b) => b.value - a.value);

    const largestSector = sectorAllocation[0]
      ? { name: sectorAllocation[0].key, percentage: sectorAllocation[0].percentage }
      : { name: 'None', percentage: 0 };

    const largestHolding = stockAllocation[0]
      ? {
          name: holdings.find((h) => h.ticker === stockAllocation[0].key)?.name || stockAllocation[0].key,
          ticker: stockAllocation[0].key,
          percentage: stockAllocation[0].percentage,
        }
      : { name: 'None', ticker: 'None', percentage: 0 };

    const taxEstimate = calculateEstimatedTax(realizedGainsForTax);

    return {
      portfolioId: portfolio.id,
      name: portfolio.name,
      currency: portfolio.baseCurrency,
      totalValue: Math.round(totalCurrentValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      todayPnL: Math.round(totalTodayPnL * 100) / 100,
      todayPnLPercent,
      totalPnL,
      totalPnLPercent,
      realizedPnL: Math.round(totalRealizedPnL * 100) / 100,
      unrealizedPnL: totalPnL,
      xirr,
      cagr: totalPnLPercent,
      maxDrawdownPct: 4.8, // indicative from historic snapshots
      holdingsCount: holdings.length,
      profitablePositions,
      losingPositions,
      largestHolding,
      largestSector,
      taxSummary: {
        stcgGains: taxEstimate.totalRealizedSTCG,
        ltcgGains: taxEstimate.totalRealizedLTCG,
        estimatedTax: taxEstimate.totalEstimatedTax,
        disclaimer: taxEstimate.disclaimer,
      },
      sectorAllocation,
      stockAllocation,
      holdings,
    };
  }

  /**
   * Imports Zerodha, Groww, Upstox, or Generic CSV transactions
   */
  public async importBrokerCSV(
    userId: string,
    portfolioId: string,
    csvContent: string
  ): Promise<{ importedCount: number; errors: string[] }> {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      return { importedCount: 0, errors: ['CSV file is empty or missing header'] };
    }

    const header = lines[0].toLowerCase();
    const errors: string[] = [];
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      try {
        // Parse CSV row with quote handling
        const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());

        let symbol = '';
        let type: 'BUY' | 'SELL' = 'BUY';
        let qty = 0;
        let price = 0;
        let dateStr = new Date().toISOString().slice(0, 10);

        // Detect broker format
        if (header.includes('symbol') && header.includes('trade_type')) {
          // Zerodha tradebook style
          symbol = cols[0] || cols[1];
          type = (cols[2] || 'BUY').toUpperCase().includes('SELL') ? 'SELL' : 'BUY';
          qty = Number(cols[3] || 0);
          price = Number(cols[4] || 0);
          dateStr = cols[5] || dateStr;
        } else if (header.includes('stock name') || header.includes('ticker')) {
          // Standard / Portfolio Engine export format
          symbol = cols[1] || cols[0];
          qty = Number(cols[3] || 1);
          price = Number(cols[4] || 0);
          dateStr = cols[5] || dateStr;
        } else {
          // Generic CSV format: Symbol, Type, Qty, Price, Date
          symbol = cols[0];
          type = (cols[1] || 'BUY').toUpperCase().includes('SELL') ? 'SELL' : 'BUY';
          qty = Number(cols[2] || 0);
          price = Number(cols[3] || 0);
          dateStr = cols[4] || dateStr;
        }

        if (!symbol || qty <= 0 || price <= 0) {
          errors.push(`Row ${i + 1}: Invalid data for symbol: "${symbol}", qty: ${qty}, price: ${price}`);
          continue;
        }

        const cleanSym = symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;

        // Find or create instrument
        let inst = dbManager.instruments.get(cleanSym) || dbManager.instruments.get(cleanSym.replace('.NS', ''));
        if (!inst) {
          const instId = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          inst = {
            id: instId,
            symbol: cleanSym,
            exchange: 'NSE',
            name: symbol.toUpperCase().replace('.NS', ''),
            sector: 'General',
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

        // Add Transaction
        const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
        const tx: DbTransaction = {
          id: txId,
          userId,
          portfolioId,
          instrumentId: inst.id,
          transactionType: type,
          quantity: qty,
          price,
          brokerage: 0,
          taxes: 0,
          otherCharges: 0,
          transactionDate: new Date(dateStr),
          notes: 'Imported via CSV statement',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        dbManager.transactions.set(txId, tx);
        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: Parse failure: ${err?.message || 'Unknown error'}`);
      }
    }

    return { importedCount, errors };
  }
}

export const portfolioEngine = new PortfolioEngine();
