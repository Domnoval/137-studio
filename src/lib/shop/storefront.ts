/**
 * Shopify Storefront API client.
 *
 * One thin, server-side fetch wrapper over the Storefront GraphQL endpoint.
 * The access token stays on the server (never shipped to the browser) and is
 * read from the environment, so nothing secret lives in the repo:
 *
 *   SHOPIFY_STORE_DOMAIN      e.g. tonic-thought-studios-2.myshopify.com
 *   SHOPIFY_STOREFRONT_TOKEN  the Storefront API access token (created in admin)
 *
 * `isShopConfigured()` lets every page degrade gracefully to a tasteful
 * "opening soon" state when the env isn't set yet — so the build and deploy
 * never break just because the token hasn't been added.
 */

const API_VERSION = '2024-10';

export function shopDomain(): string | null {
  return process.env.SHOPIFY_STORE_DOMAIN?.trim() || null;
}

function storefrontToken(): string | null {
  return process.env.SHOPIFY_STOREFRONT_TOKEN?.trim() || null;
}

export function isShopConfigured(): boolean {
  return Boolean(shopDomain() && storefrontToken());
}

export class ShopNotConfiguredError extends Error {
  constructor() {
    super('Shopify storefront is not configured (missing env vars).');
    this.name = 'ShopNotConfiguredError';
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

/**
 * Execute a Storefront GraphQL operation. Cached for `revalidate` seconds via
 * Next's fetch cache (product data changes slowly; carts pass revalidate: 0).
 */
export async function storefront<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidate: number | false = 300,
): Promise<T> {
  const domain = shopDomain();
  const token = storefrontToken();
  if (!domain || !token) throw new ShopNotConfiguredError();

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    next: revalidate === false ? { revalidate: 0 } : { revalidate },
  });

  if (!res.ok) {
    throw new Error(`Storefront API ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(`Storefront API: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) throw new Error('Storefront API returned no data');
  return json.data;
}
