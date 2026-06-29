'use client';

/**
 * Cart button + slide-in drawer. The button shows the line count; the drawer
 * lists items with quantity steppers and a checkout action that builds a real
 * Shopify cart server-side and redirects to Shopify's hosted checkout.
 */

import React, { useState } from 'react';
import { useCart } from './CartContext';
import { formatMoney } from '@/lib/shop/money';

const C = {
  void: '#0e0c0a',
  charcoal: '#1a1a1e',
  steel: '#2a2d3a',
  red: '#c41230',
  chalk: '#e8e4dc',
  faded: '#a09890',
};
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cinzel', Georgia, serif";

export default function CartDrawer() {
  const { items, count, setQuantity, remove } = useCart();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.price.amount * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? 'USD';

  const checkout = async () => {
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/shop/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: items.map((i) => ({ merchandiseId: i.merchandiseId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'transparent', border: 'none', color: C.chalk, cursor: 'pointer', fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}
        aria-label={`Cart, ${count} items`}
      >
        Cart{count > 0 ? ` (${count})` : ''}
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(10,8,8,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end' }}
        >
          <aside style={{ width: 'min(420px, 100%)', height: '100%', background: C.charcoal, borderLeft: `1px solid ${C.steel}`, padding: 21, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 21 }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 18, color: C.chalk, letterSpacing: '0.08em', margin: 0 }}>Cart</h2>
              <button onClick={() => setOpen(false)} aria-label="Close cart" style={{ background: 'none', border: 'none', color: C.faded, fontSize: 22, cursor: 'pointer', fontFamily: MONO }}>×</button>
            </div>

            {items.length === 0 ? (
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.faded }}>Your cart is empty.</p>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {items.map((i) => (
                    <div key={i.merchandiseId} style={{ display: 'flex', gap: 13, borderBottom: `1px solid ${C.steel}`, paddingBottom: 16 }}>
                      {i.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.image} alt={i.productTitle} style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: SERIF, fontSize: 13, color: C.chalk, margin: 0 }}>{i.productTitle}</p>
                        {i.variantTitle !== 'Default Title' && (
                          <p style={{ fontFamily: MONO, fontSize: 10, color: C.faded, margin: '2px 0 0' }}>{i.variantTitle}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <Stepper value={i.quantity} onChange={(q) => setQuantity(i.merchandiseId, q)} />
                          <span style={{ fontFamily: MONO, fontSize: 12, color: C.chalk }}>{formatMoney({ amount: i.price.amount * i.quantity, currencyCode: i.price.currencyCode })}</span>
                          <button onClick={() => remove(i.merchandiseId)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.faded, fontFamily: MONO, fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}>remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 13, color: C.chalk, marginBottom: 13 }}>
                    <span style={{ color: C.faded, letterSpacing: '0.1em' }}>SUBTOTAL</span>
                    <span>{formatMoney({ amount: subtotal, currencyCode: currency })}</span>
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: 9.5, color: C.faded, margin: '0 0 13px' }}>Shipping &amp; taxes calculated at checkout.</p>
                  {error && <p style={{ fontFamily: MONO, fontSize: 11, color: C.red, margin: '0 0 10px' }}>{error}</p>}
                  <button
                    onClick={checkout}
                    disabled={busy}
                    style={{ width: '100%', fontFamily: SERIF, fontSize: 14, letterSpacing: '0.08em', padding: '14px', cursor: busy ? 'wait' : 'pointer', background: C.red, color: C.chalk, border: 'none' }}
                  >
                    {busy ? 'Opening checkout…' : 'Checkout'}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn: React.CSSProperties = { width: 24, height: 24, background: 'transparent', border: `1px solid ${C.steel}`, color: C.chalk, cursor: 'pointer', fontFamily: MONO, fontSize: 13, lineHeight: 1 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <button onClick={() => onChange(value - 1)} style={btn} aria-label="Decrease">−</button>
      <span style={{ fontFamily: MONO, fontSize: 12, color: C.chalk, minWidth: 28, textAlign: 'center' }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={btn} aria-label="Increase">+</button>
    </div>
  );
}
