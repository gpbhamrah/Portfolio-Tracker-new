export interface TransactionItem {
  id?: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'BONUS' | 'SPLIT';
  quantity: number;
  price: number;
  brokerage?: number;
  taxes?: number;
  otherCharges?: number;
  date: string | Date;
}

export interface HoldingPosition {
  quantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  realizedPnL: number;
  firstBuyDate: string;
  lastTransactionDate: string;
}

/**
 * Calculates current market value of a position
 */
export function calculateCurrentValue(quantity: number, cmp: number): number {
  if (quantity <= 0 || cmp <= 0) return 0;
  return Math.round(quantity * cmp * 100) / 100;
}

/**
 * Calculates unrealized profit/loss and percentage return
 */
export function calculateUnrealizedPnL(
  quantity: number,
  averageBuyPrice: number,
  cmp: number
): { pnl: number; pnlPercent: number } {
  if (quantity <= 0 || averageBuyPrice <= 0) {
    return { pnl: 0, pnlPercent: 0 };
  }
  const invested = quantity * averageBuyPrice;
  const curVal = quantity * cmp;
  const pnl = Math.round((curVal - invested) * 100) / 100;
  const pnlPercent = invested > 0 ? Math.round(((curVal - invested) / invested) * 10000) / 100 : 0;
  return { pnl, pnlPercent };
}

/**
 * Calculates return percentage between cost and current value
 */
export function calculateReturnPercentage(cost: number, current: number): number {
  if (cost <= 0) return 0;
  return Math.round(((current - cost) / cost) * 10000) / 100;
}

/**
 * Standard FIFO (First In First Out) Transaction Processor
 * Reconstructs exact remaining quantity, average buy cost of remaining shares,
 * and cumulative realized P&L from historical buys/sells/splits/bonuses.
 */
export function processTransactionsFIFO(transactions: TransactionItem[]): HoldingPosition {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  interface BuyLot {
    quantity: number;
    price: number;
    date: string;
  }

  const buyLots: BuyLot[] = [];
  let realizedPnL = 0;
  let firstBuyDate = '';
  let lastDate = '';

  for (const tx of sorted) {
    const txDateStr = new Date(tx.date).toISOString().slice(0, 10);
    lastDate = txDateStr;

    if (tx.type === 'BUY') {
      if (!firstBuyDate) firstBuyDate = txDateStr;
      const effectivePrice =
        tx.price + ((tx.brokerage || 0) + (tx.taxes || 0) + (tx.otherCharges || 0)) / tx.quantity;
      buyLots.push({
        quantity: tx.quantity,
        price: effectivePrice,
        date: txDateStr,
      });
    } else if (tx.type === 'SELL') {
      let qtyToSell = tx.quantity;
      const netSellPrice =
        tx.price - ((tx.brokerage || 0) + (tx.taxes || 0) + (tx.otherCharges || 0)) / tx.quantity;

      while (qtyToSell > 0 && buyLots.length > 0) {
        const oldestLot = buyLots[0];
        if (oldestLot.quantity <= qtyToSell) {
          // Sell entire lot
          const profit = (netSellPrice - oldestLot.price) * oldestLot.quantity;
          realizedPnL += profit;
          qtyToSell -= oldestLot.quantity;
          buyLots.shift();
        } else {
          // Partially sell lot
          const profit = (netSellPrice - oldestLot.price) * qtyToSell;
          realizedPnL += profit;
          oldestLot.quantity -= qtyToSell;
          qtyToSell = 0;
        }
      }
    } else if (tx.type === 'SPLIT' || tx.type === 'BONUS') {
      // Split or bonus adjusts lot quantities and prices
      const multiplier = tx.quantity; // ratio, e.g. 2 for 1:1 bonus
      if (multiplier > 0) {
        for (const lot of buyLots) {
          lot.quantity *= multiplier;
          lot.price /= multiplier;
        }
      }
    } else if (tx.type === 'DIVIDEND') {
      realizedPnL += (tx.price || 0) * (tx.quantity || 1);
    }
  }

  const totalQuantity = buyLots.reduce((sum, l) => sum + l.quantity, 0);
  const totalCost = buyLots.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const averageBuyPrice = totalQuantity > 0 ? Math.round((totalCost / totalQuantity) * 100) / 100 : 0;

  return {
    quantity: totalQuantity,
    averageBuyPrice,
    totalInvested: Math.round(totalCost * 100) / 100,
    realizedPnL: Math.round(realizedPnL * 100) / 100,
    firstBuyDate: firstBuyDate || new Date().toISOString().slice(0, 10),
    lastTransactionDate: lastDate || new Date().toISOString().slice(0, 10),
  };
}
