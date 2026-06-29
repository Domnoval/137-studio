/**
 * Shop section layout. Scopes the cart provider to /shop (the rest of the site
 * doesn't need it) and renders a slim shop header with the cart drawer.
 */

import React from 'react';
import Link from 'next/link';
import { CartProvider } from '@/components/shop/CartContext';
import CartDrawer from '@/components/shop/CartDrawer';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div style={{ background: '#0e0c0a', minHeight: '100vh' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px clamp(16px, 4vw, 48px)',
            borderBottom: '1px solid #2a2d3a',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(14,12,10,0.85)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Link
            href="/shop"
            style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 18, color: '#e8e4dc', letterSpacing: '0.1em', textDecoration: 'none' }}
          >
            Shop
          </Link>
          <CartDrawer />
        </header>
        {children}
      </div>
    </CartProvider>
  );
}
