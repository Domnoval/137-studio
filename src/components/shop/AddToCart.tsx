'use client';

/**
 * Variant picker + add-to-cart for a product detail page. Renders one selector
 * per real option (Size, Color, …), resolves the selected combination to a
 * concrete variant, and adds it to the cart. Single-variant products skip the
 * pickers entirely and just show the button.
 */

import React, { useMemo, useState } from 'react';
import { useCart } from './CartContext';
import { formatMoney } from '@/lib/shop/money';
import type { ShopProduct, ShopVariant } from '@/lib/shop';

const C = { red: '#c41230', chalk: '#e8e4dc', faded: '#a09890', steel: '#2a2d3a', void: '#0e0c0a', green: '#4ade80' };
const MONO = "'JetBrains Mono', monospace";

function variantMatches(v: ShopVariant, selected: Record<string, string>): boolean {
  return Object.entries(selected).every(([k, val]) => v.options[k] === val);
}

export default function AddToCart({ product }: { product: ShopProduct }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  // Seed selections from the first available (or first) variant.
  const initial = useMemo(() => {
    const base = product.variants.find((v) => v.available) ?? product.variants[0];
    const sel: Record<string, string> = {};
    for (const name of product.optionNames) sel[name] = base?.options[name] ?? '';
    return sel;
  }, [product]);
  const [selected, setSelected] = useState<Record<string, string>>(initial);

  const variant: ShopVariant | undefined = useMemo(() => {
    if (product.optionNames.length === 0) return product.variants[0];
    return product.variants.find((v) => variantMatches(v, selected));
  }, [product, selected]);

  const valuesFor = (name: string): string[] => {
    const seen = new Set<string>();
    for (const v of product.variants) {
      const val = v.options[name];
      if (val) seen.add(val);
    }
    return [...seen];
  };

  const onAdd = () => {
    if (!variant) return;
    add({
      merchandiseId: variant.id,
      quantity: 1,
      productTitle: product.title,
      variantTitle: variant.title,
      handle: product.handle,
      price: variant.price,
      image: product.featuredImage?.url ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const soldOut = !variant?.available;

  return (
    <div>
      {product.optionNames.map((name) => (
        <div key={name} style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: MONO, fontSize: 10, color: C.faded, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            {name}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {valuesFor(name).map((val) => {
              const active = selected[name] === val;
              return (
                <button
                  key={val}
                  onClick={() => setSelected((s) => ({ ...s, [name]: val }))}
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    background: active ? C.chalk : 'transparent',
                    color: active ? C.void : C.chalk,
                    border: `1px solid ${active ? C.chalk : C.steel}`,
                  }}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 21 }}>
        <span style={{ fontFamily: MONO, fontSize: 18, color: C.chalk }}>
          {variant ? formatMoney(variant.price) : formatMoney(product.priceFrom)}
        </span>
        <button
          onClick={onAdd}
          disabled={soldOut || !variant}
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 13,
            letterSpacing: '0.08em',
            padding: '13px 28px',
            cursor: soldOut ? 'not-allowed' : 'pointer',
            background: 'transparent',
            color: soldOut ? C.faded : added ? C.green : C.chalk,
            border: `1px solid ${soldOut ? C.steel : added ? C.green : C.red}`,
            transition: 'all 0.2s',
          }}
        >
          {soldOut ? 'Sold out' : added ? 'Added ✓' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
}
