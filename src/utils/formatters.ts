export function formatCurrency(value: number | undefined | null): string {
  const num = Number(value || 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompactCurrency(value: number | undefined | null): string {
  const num = Math.abs(Number(value || 0));
  const sign = (value || 0) < 0 ? '-' : '';
  if (num >= 10000000) {
    return `${sign}₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `${sign}₹${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `${sign}₹${(num / 1000).toFixed(1)} K`;
  }
  return formatCurrency(value);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function calculateDaysHeld(buyDate: string | undefined | null): number {
  if (!buyDate) return 0;
  try {
    const buy = new Date(buyDate);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - buy.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function formatHoldingDuration(buyDate: string | undefined | null): string {
  const days = calculateDaysHeld(buyDate);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  
  const months = Math.floor(days / 30.4375);
  const remainingDays = Math.floor(days % 30.4375);
  
  if (days < 365) {
    return remainingDays > 0 ? `${months}m ${remainingDays}d` : `${months} mos`;
  }
  
  const years = Math.floor(days / 365.25);
  const remMonths = Math.floor((days % 365.25) / 30.4375);
  return remMonths > 0 ? `${years}y ${remMonths}m` : `${years} yrs`;
}

export function getTaxCategory(buyDate: string | undefined | null): {
  type: 'STCG' | 'LTCG';
  label: string;
  days: number;
} {
  const days = calculateDaysHeld(buyDate);
  if (days >= 365) {
    return { type: 'LTCG', label: 'LTCG (>1 yr)', days };
  }
  return { type: 'STCG', label: `STCG (${365 - days}d to LTCG)`, days };
}
