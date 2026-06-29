/**
 * Shopify storefront — public surface.
 *
 * Typed functions the app calls: list products, fetch one by handle, create a
 * cart and hand back Shopify's hosted checkout URL. All mapping from the raw
 * Storefront `edges/node` GraphQL into the flat domain types happens here.
 */

import { storefront } from './storefront';
import { PRODUCTS_QUERY, PRODUCT_BY_HANDLE_QUERY, CART_CREATE_MUTATION } from './queries';
import type { ShopProduct, ShopVariant, ShopImage, Money, CartLine } from './types';

export { isShopConfigured, shopDomain, ShopNotConfiguredError } from './storefront';
export type { ShopProduct, ShopVariant, ShopImage, Money, CartLine } from './types';

// ── raw API shapes (only what we read) ──────────────────────────────
interface RawMoney {
  amount: string;
  currencyCode: string;
}
interface RawImage {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}
interface RawProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: RawImage | null;
  images: { edges: { node: RawImage }[] };
  options: { name: string; values: string[] }[];
  priceRange: { minVariantPrice: RawMoney };
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        price: RawMoney;
        selectedOptions: { name: string; value: string }[];
      };
    }[];
  };
}

function money(m: RawMoney): Money {
  return { amount: Number(m.amount), currencyCode: m.currencyCode };
}
function image(i: RawImage | null): ShopImage | null {
  return i ? { url: i.url, altText: i.altText, width: i.width, height: i.height } : null;
}

function mapProduct(p: RawProduct): ShopProduct {
  const variants: ShopVariant[] = p.variants.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    available: node.availableForSale,
    price: money(node.price),
    options: Object.fromEntries(node.selectedOptions.map((o) => [o.name, o.value])),
  }));

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType,
    tags: p.tags,
    featuredImage: image(p.featuredImage),
    images: p.images.edges.map((e) => image(e.node)!).filter(Boolean),
    priceFrom: money(p.priceRange.minVariantPrice),
    variants,
    // Drop Shopify's synthetic single "Title" option so simple products
    // (one variant) don't render a pointless "Title: Default Title" picker.
    optionNames: p.options
      .filter((o) => !(o.name === 'Title' && o.values.length === 1 && o.values[0] === 'Default Title'))
      .map((o) => o.name),
    available: p.availableForSale,
  };
}

/** All published products, newest first. */
export async function getProducts(first = 50): Promise<ShopProduct[]> {
  const data = await storefront<{ products: { edges: { node: RawProduct }[] } }>(
    PRODUCTS_QUERY,
    { first },
  );
  return data.products.edges.map((e) => mapProduct(e.node));
}

/** One product by handle, or null if not found / unpublished. */
export async function getProduct(handle: string): Promise<ShopProduct | null> {
  const data = await storefront<{ product: RawProduct | null }>(PRODUCT_BY_HANDLE_QUERY, {
    handle,
  });
  return data.product ? mapProduct(data.product) : null;
}

/**
 * Create a Shopify cart from the given lines and return the hosted checkout
 * URL. We hand checkout off to Shopify so payments, taxes, shipping, and
 * fraud are all handled by the platform — never reimplemented here.
 */
export async function createCheckout(lines: CartLine[]): Promise<string> {
  if (lines.length === 0) throw new Error('Cannot create a checkout with no lines');

  const data = await storefront<{
    cartCreate: {
      cart: { checkoutUrl: string } | null;
      userErrors: { message: string }[];
    };
  }>(
    CART_CREATE_MUTATION,
    { lines: lines.map((l) => ({ merchandiseId: l.merchandiseId, quantity: l.quantity })) },
    false, // never cache a cart mutation
  );

  const { cart, userErrors } = data.cartCreate;
  if (userErrors.length) throw new Error(userErrors.map((e) => e.message).join('; '));
  if (!cart?.checkoutUrl) throw new Error('Cart created without a checkout URL');
  return cart.checkoutUrl;
}
