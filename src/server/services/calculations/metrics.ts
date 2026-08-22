export interface CashFlow {
  amount: number; // Negative for investment cash outflows, Positive for current value or inflows
  date: Date;
}

/**
 * Calculates XIRR (Extended Internal Rate of Return) via Newton-Raphson iteration.
 * Returns annual return percentage, e.g. 18.5 for 18.5%.
 */
export function calculateXIRR(cashFlows: CashFlow[], guess = 0.1): number {
  if (!cashFlows || cashFlows.length < 2) return 0;

  // Verify at least one positive and one negative cash flow exists
  let hasPos = false;
  let hasNeg = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPos = true;
    if (cf.amount < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return 0;

  const d0 = cashFlows[0].date.getTime();
  const maxIterations = 100;
  const tolerance = 1e-6;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let fValue = 0;
    let fDerivative = 0;

    for (const cf of cashFlows) {
      const years = (cf.date.getTime() - d0) / (365.25 * 24 * 60 * 60 * 1000);
      const denom = Math.pow(1 + rate, years);
      if (denom === 0 || isNaN(denom)) continue;

      fValue += cf.amount / denom;
      fDerivative -= (years * cf.amount) / (denom * (1 + rate));
    }

    if (Math.abs(fValue) < tolerance) {
      return Math.round(rate * 10000) / 100;
    }

    if (Math.abs(fDerivative) < 1e-12) {
      break;
    }

    const nextRate = rate - fValue / fDerivative;
    if (isNaN(nextRate) || !isFinite(nextRate) || nextRate <= -0.9999) {
      rate = (rate + 0.1) / 2;
    } else {
      rate = nextRate;
    }
  }

  return Math.round(rate * 10000) / 100;
}

/**
 * Calculates CAGR (Compound Annual Growth Rate)
 */
export function calculateCAGR(beginValue: number, endValue: number, years: number): number {
  if (beginValue <= 0 || endValue <= 0 || years <= 0) return 0;
  const cagr = Math.pow(endValue / beginValue, 1 / years) - 1;
  return Math.round(cagr * 10000) / 100;
}

/**
 * Calculates Maximum Drawdown from an array of historical portfolio valuation peaks
 */
export function calculateDrawdown(values: number[]): { maxDrawdownPct: number; currentDrawdownPct: number } {
  if (!values || values.length === 0) {
    return { maxDrawdownPct: 0, currentDrawdownPct: 0 };
  }

  let peak = values[0];
  let maxDrawdown = 0;

  for (const val of values) {
    if (val > peak) {
      peak = val;
    }
    const dd = peak > 0 ? (peak - val) / peak : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  const latestVal = values[values.length - 1];
  const currentDD = peak > 0 ? (peak - latestVal) / peak : 0;

  return {
    maxDrawdownPct: Math.round(maxDrawdown * 10000) / 100,
    currentDrawdownPct: Math.round(currentDD * 10000) / 100,
  };
}

/**
 * Calculates percentage breakdown for sectors or individual stocks
 */
export function calculatePortfolioAllocation(
  items: Array<{ key: string; value: number }>
): Array<{ key: string; value: number; percentage: number }> {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  if (total <= 0) return items.map((i) => ({ ...i, percentage: 0 }));

  return items.map((item) => ({
    key: item.key,
    value: item.value,
    percentage: Math.round((Math.max(0, item.value) / total) * 10000) / 100,
  }));
}
