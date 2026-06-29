/**
 * Shopify storefront — domain types.
 *
 * Normalized shapes the 137 UI consumes, deliberately smaller and flatter than
 * the raw Storefront API GraphQL. Mapping from the API lives in `index.ts` so
 * the rest of the app never touches an `edges/node` again.
 */

export interface Money {
  amount: number;
  currencyCode: string;
}

export interface ShopImage {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}

export interface ShopVariant {
  id: string;
  title: string;
  available: boolean;
  price: Money;
  /** Option name → value, e.g. { Size: "11x14", Color: "Black" }. */
  options: Record<string, string>;
}

export interface ShopProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  /** Sanitized HTML body, when present (Shopify `descriptionHtml`). */
  descriptionHtml?: string;
  productType: string;
  tags: string[];
  featuredImage: ShopImage | null;
  images: ShopImage[];
  priceFrom: Money;
  variants: ShopVariant[];
  /** Distinct option names in display order, e.g. ["Size", "Color"]. */
  optionNames: string[];
  available: boolean;
}

/** A line the customer wants to buy: a variant + how many. */
export interface CartLine {
  merchandiseId: string;
  quantity: number;
}
