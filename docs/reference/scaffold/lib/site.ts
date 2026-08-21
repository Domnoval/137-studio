// ─────────────────────────────────────────────────────────────────────────────
// SITE CONFIG — env-driven external defaults. Spec: STATE_BIBLE §8.
// PRESS = Shopify storefront. Set NEXT_PUBLIC_SHOPIFY_URL to light SALVAGE.
// ─────────────────────────────────────────────────────────────────────────────

export const PRESS_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_URL ?? "";