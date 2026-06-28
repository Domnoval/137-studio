/**
 * Odds arithmetic. The small, boring conversions everything else stands on,
 * isolated so they're trivially testable and impossible to get subtly wrong
 * in three different places.
 *
 * Decimal odds are the canonical internal form: a $1 stake returns
 * `decimal` total (stake + profit) on a win. American odds are what the book
 * shows and what the user pastes.
 */

import type { Odds } from '../types';

/** American moneyline → decimal odds. -120 → 1.8333…, +150 → 2.5. */
export function americanToDecimal(american: number): number {
  if (american === 0 || !Number.isFinite(american)) {
    throw new Error(`Invalid american odds: ${american}`);
  }
  return american > 0 ? 1 + american / 100 : 1 + 100 / -american;
}

/** Decimal odds → American moneyline. 2.5 → +150, 1.8333… → -120. */
export function decimalToAmerican(decimal: number): number {
  if (!(decimal > 1)) {
    throw new Error(`Invalid decimal odds: ${decimal} (must be > 1)`);
  }
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

/** Normalize any tagged Odds value to decimal. */
export function toDecimal(odds: Odds): number {
  return odds.format === 'decimal'
    ? validateDecimal(odds.value)
    : americanToDecimal(odds.value);
}

/** Raw implied probability of a decimal price, including the vig. */
export function impliedProbability(decimal: number): number {
  return 1 / validateDecimal(decimal);
}

function validateDecimal(decimal: number): number {
  if (!(decimal > 1) || !Number.isFinite(decimal)) {
    throw new Error(`Invalid decimal odds: ${decimal} (must be > 1)`);
  }
  return decimal;
}

/**
 * Parse a loose user string into tagged Odds. Accepts "-120", "+105",
 * "1.83", with surrounding whitespace. Returns null on anything unparseable
 * so the UI can show a quiet hint rather than throw mid-keystroke.
 */
export function parseOdds(input: string): Odds | null {
  const s = input.trim();
  if (!s) return null;

  // Explicit American sign always wins.
  if (/^[+-]\d+$/.test(s)) {
    const value = Number(s);
    if (value === 0) return null;
    return { format: 'american', value };
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  // A bare number > 1 with a decimal point reads as decimal odds; a bare
  // integer like "150" or "-110" reads as American — that's how books print.
  if (s.includes('.') && n > 1) return { format: 'decimal', value: n };
  if (Number.isInteger(n) && Math.abs(n) >= 100) {
    return { format: 'american', value: n };
  }
  if (n > 1) return { format: 'decimal', value: n };
  return null;
}
