/**
 * /shop — the product grid.
 *
 * Server component: fetches live products from Shopify at request time and
 * renders them in the 137 gallery idiom (big imagery, editorial labels). If the
 * store isn't configured yet, or the API hiccups, it degrades to a calm
 * "opening soon" state rather than erroring the route.
 */

import Link from 'next/link';
import { getProducts, isShopConfigured, type ShopProduct } from '@/lib/shop';
import { formatMoney } from '@/lib/shop/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shop · 137 Studio', description: 'Prints, journals, and editions from 137 Studio.' };

const C = { void: '#0e0c0a', red: '#c41230', chalk: '#e8e4dc', faded: '#a09890' };
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cinzel', Georgia, serif";

export default async function ShopPage() {
  let products: ShopProduct[] = [];
  let failed = false;

  if (isShopConfigured()) {
    try {
      products = await getProducts(50);
    } catch {
      failed = true;
    }
  }

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 'clamp(32px, 6vw, 72px) clamp(16px, 4vw, 48px) 96px' }}>
      <div style={{ marginBottom: 'clamp(24px, 5vw, 56px)' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 7vw, 4rem)', color: C.chalk, letterSpacing: '0.08em', margin: 0 }}>
          The Shop
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 11, color: C.faded, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '10px 0 0' }}>
          Prints · Journals · Editions
        </p>
        <div style={{ width: 120, height: 1, background: C.red, marginTop: 13, boxShadow: '0 0 20px rgba(196,18,48,0.4)' }} />
      </div>

      {!isShopConfigured() ? (
        <Notice title="Shop opening soon" body="The storefront is wired up and waiting on its Shopify connection. Once the store credentials are in place, prints, journals, and editions appear here automatically." />
      ) : failed ? (
        <Notice title="Store temporarily unavailable" body="Couldn't reach the store just now. Refresh in a moment." />
      ) : products.length === 0 ? (
        <Notice title="Nothing here yet" body="No published products in the store yet. Add prints, journals, or editions in Shopify and they'll show up here." />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'clamp(16px, 2.5vw, 32px)',
          }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <Link href={`/shop/${product.handle}`} style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', background: '#1a1a1e', border: '1px solid #2a2d3a' }}>
        {product.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: SERIF, color: C.faded, fontSize: 28 }}>137</div>
        )}
        {!product.available && (
          <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.chalk, background: 'rgba(14,12,10,0.8)', padding: '4px 8px' }}>
            Sold out
          </span>
        )}
      </div>
      <div style={{ padding: '12px 2px 0' }}>
        <p style={{ fontFamily: SERIF, fontSize: 14, color: C.chalk, margin: 0, letterSpacing: '0.03em' }}>{product.title}</p>
        <p style={{ fontFamily: MONO, fontSize: 11, color: C.faded, margin: '5px 0 0' }}>
          {product.priceFrom.amount > 0 ? `from ${formatMoney(product.priceFrom)}` : ''}
          {product.productType ? `  ·  ${product.productType.toLowerCase()}` : ''}
        </p>
      </div>
    </Link>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ border: '1px solid #2a2d3a', padding: 'clamp(32px, 6vw, 64px)', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <p style={{ fontFamily: SERIF, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', color: C.chalk, margin: '0 0 12px', letterSpacing: '0.05em' }}>{title}</p>
      <p style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 15, color: C.faded, lineHeight: 1.7, margin: 0 }}>{body}</p>
    </div>
  );
}
