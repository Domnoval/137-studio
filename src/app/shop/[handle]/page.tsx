/**
 * /shop/[handle] — product detail.
 *
 * Server component fetches the product; the variant picker + add-to-cart is a
 * client island (`AddToCart`). Image gallery left, buy column right, collapsing
 * to a single column on mobile.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, isShopConfigured } from '@/lib/shop';
import AddToCart from '@/components/shop/AddToCart';

export const dynamic = 'force-dynamic';

const C = { void: '#0e0c0a', red: '#c41230', chalk: '#e8e4dc', faded: '#a09890', steel: '#2a2d3a' };
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cinzel', Georgia, serif";
const BODY = "'Crimson Text', Georgia, serif";

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  if (!isShopConfigured()) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '72px 24px' }}>
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.faded }}>Store not configured yet.</p>
        <Link href="/shop" style={back}>← back to shop</Link>
      </main>
    );
  }

  const product = await getProduct(handle).catch(() => null);
  if (!product) notFound();

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px, 5vw, 56px) clamp(16px, 4vw, 48px) 96px' }}>
      <Link href="/shop" style={back}>← back to shop</Link>

      <div style={{ display: 'flex', gap: 'clamp(24px, 5vw, 64px)', flexWrap: 'wrap', marginTop: 21 }}>
        {/* gallery */}
        <div style={{ flex: '1 1 420px', minWidth: 280 }}>
          {product.featuredImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.featuredImage.url} alt={product.featuredImage.altText ?? product.title} style={{ width: '100%', height: 'auto', display: 'block', border: `1px solid ${C.steel}` }} />
          ) : (
            <div style={{ aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1e', fontFamily: SERIF, color: C.faded, fontSize: 48 }}>137</div>
          )}
          {product.images.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8, marginTop: 8 }}>
              {product.images.slice(0, 8).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.url} alt={img.altText ?? `${product.title} ${i + 1}`} loading="lazy" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', border: `1px solid ${C.steel}` }} />
              ))}
            </div>
          )}
        </div>

        {/* buy column */}
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          {product.productType && (
            <p style={{ fontFamily: MONO, fontSize: 10, color: C.faded, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>{product.productType}</p>
          )}
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', color: C.chalk, letterSpacing: '0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>{product.title}</h1>
          <div style={{ width: 48, height: 1, background: C.red, margin: '0 0 21px' }} />

          <AddToCart product={product} />

          {product.description && (
            <p style={{ fontFamily: BODY, fontSize: 16, color: '#c8c4bc', lineHeight: 1.7, marginTop: 28, whiteSpace: 'pre-line' }}>
              {product.description}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

const back: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  color: C.faded,
  letterSpacing: '0.1em',
  textDecoration: 'none',
};
