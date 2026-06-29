/**
 * Currency formatting — one place so prices read identically everywhere.
 */

import type { Money } from './types';

export function formatMoney(m: Money): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: m.currencyCode,
      // Drop cents on whole-dollar prices; keep them otherwise.
      minimumFractionDigits: Number.isInteger(m.amount) ? 0 : 2,
    }).format(m.amount);
  } catch {
    return `$${m.amount.toFixed(2)}`;
  }
}
