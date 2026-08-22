export interface TaxConfiguration {
  financialYear: string;
  stcgThresholdDays: number; // 365 for equity shares listed on recognized stock exchange in India
  stcgRatePercent: number; // 20% (Budget 2024 revised STCG rate)
  ltcgRatePercent: number; // 12.5% (Budget 2024 revised LTCG rate)
  ltcgExemptionLimit: number; // ₹1,25,000 exemption under Section 112A
}

export const DEFAULT_INDIAN_TAX_CONFIG: TaxConfiguration = {
  financialYear: 'FY 2024-25 / FY 2025-26',
  stcgThresholdDays: 365,
  stcgRatePercent: 20.0,
  ltcgRatePercent: 12.5,
  ltcgExemptionLimit: 125000,
};

export interface TaxClassification {
  holdingPeriodDays: number;
  category: 'STCG' | 'LTCG';
  daysToLTCG: number;
  label: string;
  isLongTerm: boolean;
}

/**
 * Calculates exact holding period in days between buy date and current/sell date
 */
export function calculateHoldingPeriod(buyDate: string | Date, currentDate: string | Date = new Date()): number {
  try {
    const buy = new Date(buyDate);
    const curr = new Date(currentDate);
    const diff = curr.getTime() - buy.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

/**
 * Classifies holding as STCG (Short Term Capital Gains) or LTCG (Long Term Capital Gains)
 * according to Indian Income Tax rules for listed equities (holding > 12 months = LTCG).
 */
export function calculateTaxCategory(
  buyDate: string | Date,
  config: TaxConfiguration = DEFAULT_INDIAN_TAX_CONFIG,
  currentDate: string | Date = new Date()
): TaxClassification {
  const days = calculateHoldingPeriod(buyDate, currentDate);
  const threshold = config.stcgThresholdDays;

  if (days >= threshold) {
    return {
      holdingPeriodDays: days,
      category: 'LTCG',
      daysToLTCG: 0,
      label: 'LTCG (>1 Year)',
      isLongTerm: true,
    };
  }

  return {
    holdingPeriodDays: days,
    category: 'STCG',
    daysToLTCG: Math.max(0, threshold - days),
    label: `STCG (${Math.max(0, threshold - days)}d to LTCG)`,
    isLongTerm: false,
  };
}

export interface TaxEstimateResult {
  totalRealizedSTCG: number;
  totalRealizedLTCG: number;
  estimatedSTCGTax: number;
  estimatedLTCGTax: number;
  totalEstimatedTax: number;
  disclaimer: string;
}

/**
 * Estimates total STCG and LTCG tax liabilities based on realized positions
 */
export function calculateEstimatedTax(
  realizedGains: Array<{ gain: number; isLTCG: boolean }>,
  config: TaxConfiguration = DEFAULT_INDIAN_TAX_CONFIG
): TaxEstimateResult {
  let totalSTCG = 0;
  let totalLTCG = 0;

  for (const item of realizedGains) {
    if (item.isLTCG) {
      totalLTCG += item.gain;
    } else {
      totalSTCG += item.gain;
    }
  }

  // STCG tax
  const estimatedSTCGTax = totalSTCG > 0 ? (totalSTCG * config.stcgRatePercent) / 100 : 0;

  // LTCG tax after statutory exemption (e.g. ₹1.25L)
  const taxableLTCG = Math.max(0, totalLTCG - config.ltcgExemptionLimit);
  const estimatedLTCGTax = taxableLTCG > 0 ? (taxableLTCG * config.ltcgRatePercent) / 100 : 0;

  return {
    totalRealizedSTCG: Math.round(totalSTCG * 100) / 100,
    totalRealizedLTCG: Math.round(totalLTCG * 100) / 100,
    estimatedSTCGTax: Math.round(estimatedSTCGTax * 100) / 100,
    estimatedLTCGTax: Math.round(estimatedLTCGTax * 100) / 100,
    totalEstimatedTax: Math.round((estimatedSTCGTax + estimatedLTCGTax) * 100) / 100,
    disclaimer:
      'Tax calculations are indicative estimates based on current Indian Income Tax rules (STCG @ 20%, LTCG @ 12.5% above ₹1.25 Lakh exemption) and do not constitute formal tax advice.',
  };
}
