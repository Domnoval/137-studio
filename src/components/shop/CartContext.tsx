'use client';

/**
 * Client-side cart, persisted to localStorage and scoped to the /shop routes.
 *
 * The cart only ever holds enough to render a line and to build the Shopify
 * cart at checkout (merchandiseId + quantity). Prices, availability, and taxes
 * are re-resolved by Shopify at checkout — we never treat the local snapshot as
 * the source of truth for money.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Money } from '@/lib/shop';

export interface CartItem {
  merchandiseId: string;
  quantity: number;
  productTitle: string;
  variantTitle: string;
  handle: string;
  price: Money;
  image: string | null;
}

interface CartState {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  setQuantity: (merchandiseId: string, quantity: number) => void;
  remove: (merchandiseId: string) => void;
  clear: () => void;
}

const KEY = 'the37thmove.cart.v1';
const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't clobber storage before the first read
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.merchandiseId === item.merchandiseId);
      if (i === -1) return [...prev, item];
      const next = [...prev];
      next[i] = { ...next[i], quantity: next[i].quantity + item.quantity };
      return next;
    });
  }, []);

  const setQuantity = useCallback((merchandiseId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((x) => x.merchandiseId !== merchandiseId)
        : prev.map((x) => (x.merchandiseId === merchandiseId ? { ...x, quantity } : x)),
    );
  }, []);

  const remove = useCallback(
    (merchandiseId: string) => setItems((prev) => prev.filter((x) => x.merchandiseId !== merchandiseId)),
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(
    () => ({
      items,
      count: items.reduce((n, x) => n + x.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, add, setQuantity, remove, clear],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
