import {
  calculateCurrentValue,
  calculateUnrealizedPnL,
  calculateReturnPercentage,
  processTransactionsFIFO,
  calculateXIRR,
  calculateCAGR,
  calculateDrawdown,
  calculatePortfolioAllocation,
  calculateHoldingPeriod,
  calculateTaxCategory,
  calculateEstimatedTax,
  calculateRealEMA,
  calculateRSI,
  calculateMACD,
} from '../services/calculations';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Test assertion failed: ${msg}`);
  }
}

export function runAllCalculationTests() {
  console.log('🧪 Starting Calculation Engine Unit Tests...');

  // 1. P&L & Value Tests
  {
    const val = calculateCurrentValue(10, 1500.5);
    assert(val === 15005, `Current value expected 15005, got ${val}`);

    const { pnl, pnlPercent } = calculateUnrealizedPnL(10, 1000, 1250);
    assert(pnl === 2500, `PnL expected 2500, got ${pnl}`);
    assert(pnlPercent === 25, `PnL % expected 25, got ${pnlPercent}`);

    const ret = calculateReturnPercentage(1000, 1250);
    assert(ret === 25, `Return % expected 25, got ${ret}`);
  }

  // 2. FIFO Transaction Processing Test
  {
    const txs = [
      { type: 'BUY' as const, quantity: 10, price: 1200, date: '2023-01-01' },
      { type: 'BUY' as const, quantity: 10, price: 1250, date: '2023-02-01' },
      { type: 'SELL' as const, quantity: 5, price: 1400, date: '2023-03-01' },
    ];
    const holding = processTransactionsFIFO(txs);
    // Sold 5 from the first lot (10 @ 1200). Remaining: 5 @ 1200 + 10 @ 1250 = 15 shares.
    // Total invested = (5 * 1200) + (10 * 1250) = 6000 + 12500 = 18500.
    // Avg buy price = 18500 / 15 = 1233.33.
    // Realized profit = 5 * (1400 - 1200) = 1000.
    assert(holding.quantity === 15, `FIFO quantity expected 15, got ${holding.quantity}`);
    assert(holding.totalInvested === 18500, `FIFO invested expected 18500, got ${holding.totalInvested}`);
    assert(holding.averageBuyPrice === 1233.33, `FIFO avg buy expected 1233.33, got ${holding.averageBuyPrice}`);
    assert(holding.realizedPnL === 1000, `FIFO realized PnL expected 1000, got ${holding.realizedPnL}`);
  }

  // 3. XIRR & CAGR Tests
  {
    const cashFlows = [
      { amount: -100000, date: new Date('2023-01-01') },
      { amount: 125000, date: new Date('2024-01-01') },
    ];
    const xirr = calculateXIRR(cashFlows);
    assert(xirr >= 24.5 && xirr <= 25.5, `XIRR expected ~25%, got ${xirr}%`);

    const cagr = calculateCAGR(100000, 144000, 2);
    assert(cagr === 20, `CAGR expected 20%, got ${cagr}%`);
  }

  // 4. Drawdown & Allocation Tests
  {
    const dd = calculateDrawdown([100, 120, 110, 90, 105, 95]);
    // Peak = 120, Lowest after peak = 90 -> drawdown = (120-90)/120 = 25%
    assert(dd.maxDrawdownPct === 25, `Max Drawdown expected 25%, got ${dd.maxDrawdownPct}%`);

    const alloc = calculatePortfolioAllocation([
      { key: 'IT', value: 60000 },
      { key: 'Banking', value: 40000 },
    ]);
    assert(alloc[0].percentage === 60, `IT allocation expected 60%, got ${alloc[0].percentage}%`);
    assert(alloc[1].percentage === 40, `Banking allocation expected 40%, got ${alloc[1].percentage}%`);
  }

  // 5. Indian Tax Categorization (STCG / LTCG)
  {
    const stcgResult = calculateTaxCategory('2024-01-01', undefined, '2024-06-01');
    assert(stcgResult.category === 'STCG', `Category expected STCG, got ${stcgResult.category}`);

    const ltcgResult = calculateTaxCategory('2023-01-01', undefined, '2024-06-01');
    assert(ltcgResult.category === 'LTCG', `Category expected LTCG, got ${ltcgResult.category}`);

    const taxEstimate = calculateEstimatedTax([
      { gain: 50000, isLTCG: false }, // STCG: 50000 @ 20% = 10000
      { gain: 200000, isLTCG: true },  // LTCG: (200000 - 125000) @ 12.5% = 75000 * 0.125 = 9375
    ]);
    assert(taxEstimate.estimatedSTCGTax === 10000, `STCG tax expected 10000, got ${taxEstimate.estimatedSTCGTax}`);
    assert(taxEstimate.estimatedLTCGTax === 9375, `LTCG tax expected 9375, got ${taxEstimate.estimatedLTCGTax}`);
    assert(taxEstimate.totalEstimatedTax === 19375, `Total tax expected 19375, got ${taxEstimate.totalEstimatedTax}`);
  }

  // 6. Authentic EMA & Technical Indicator Tests
  {
    // 5-period EMA on simple series
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const ema5 = calculateRealEMA(prices, 5);
    assert(ema5 !== null && ema5 > 0, `EMA5 should calculate, got ${ema5}`);

    // RSI calculation
    const rsi = calculateRSI([44, 44.5, 45, 43.5, 44, 45.2, 46, 46.5, 47, 46.8, 48, 49, 50, 49.5, 51, 52]);
    assert(rsi !== null && rsi >= 0 && rsi <= 100, `RSI should be between 0 and 100, got ${rsi}`);
  }

  console.log('✅ All calculation unit tests passed successfully!');
  return true;
}
