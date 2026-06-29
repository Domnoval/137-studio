/**
 * POST /api/shop/cart
 *
 * Body: { lines: [{ merchandiseId, quantity }] }
 * Creates a Shopify cart and returns its hosted checkout URL. The client then
 * redirects the buyer to Shopify, which owns payments, tax, shipping, and
 * fraud — none of that is reimplemented here.
 */

import { NextResponse } from 'next/server';
import { createCheckout, isShopConfigured, type CartLine } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isShopConfigured()) {
    return NextResponse.json({ error: 'Store is not configured.' }, { status: 503 });
  }

  let lines: CartLine[];
  try {
    const body = await request.json();
    lines = Array.isArray(body?.lines) ? body.lines : [];
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Validate before touching Shopify — cheap, and keeps errors legible.
  const clean = lines
    .filter(
      (l) =>
        typeof l?.merchandiseId === 'string' &&
        Number.isFinite(l?.quantity) &&
        l.quantity > 0,
    )
    .map((l) => ({ merchandiseId: l.merchandiseId, quantity: Math.floor(l.quantity) }));

  if (clean.length === 0) {
    return NextResponse.json({ error: 'No valid line items.' }, { status: 400 });
  }

  try {
    const checkoutUrl = await createCheckout(clean);
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed.' },
      { status: 502 },
    );
  }
}
