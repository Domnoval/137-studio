# 137 Studio — Website Architecture v1

## Domain
- **Production**: the37thmove.com
- **Brand**: 137 Studio

## Vision
A digital temple that feels like stepping into an art installation. The 137 chalkboard universe IS the space. A vintage TV is the portal to everything inside. Sacred geometry isn't decoration — it's the architecture.

## Tech Stack
- **Framework**: Next.js 15 (App Router) — SSR, SEO, API routes, streaming
- **3D Engine**: React Three Fiber + Drei + Three.js
- **Animation**: GSAP + ScrollTrigger + Lenis (smooth scroll)
- **Styling**: Tailwind CSS 4
- **CMS**: Content layer TBD (Sanity? Supabase? MDX?)
- **Ecommerce**: Shopify Storefront API (existing store)
- **AI**: Anthropic Claude API (Living Paintings chat)
- **Deployment**: Vercel (already have the37thmove.com pointing there)
- **Analytics**: Vercel Analytics

## Site Map

```
/                   → The Room (3D hero scene)
/gallery            → Channel Surf (art gallery inside the TV)
/gallery/[slug]     → Single piece (Living Painting if enabled)
/featured           → Curated broadcast (5 featured works)
/shop               → Products (Shopify + Printful)
/shop/[handle]      → Product detail
/about              → Behind the broadcast
/137                → The number (easter egg / brand story)
```

## The Experience Flow

### 1. Loading Screen (FrequencyGate)
- 137 chalkboard fills screen
- "137" large gold text, tagline, "Enter" button
- Click → dissolves into The Room

### 2. The Room (Homepage / 3D Scene)
- Full 3D environment: surreal space inspired by the Veo video
- Objects in the scene: Ganesha statue, vintage boombox, sacred geometry constructions, chalk equations on walls/floor
- **THE VINTAGE TV** — prominent in the scene, screen glowing
- Golden tesseract cube floating, rotating slowly, interactive (drag to spin)
- Camera can subtly drift with mouse parallax
- Ankh cursor with kundalini idle animation

### 3. Navigation = Entering the TV
- Click a nav item → camera dollies toward the TV
- TV screen fills the viewport
- Static/channel-switch transition
- Inner pages render "inside" the TV with CRT overlay (scan lines, vignette, slight barrel distortion)

### 4. Gallery (Inside the TV)
- Channel-surfing metaphor
- Grid of works with hover previews
- Filter by: medium, year, theme, UV/blacklight
- Click → piece expands
- Living Paintings get a chat interface
- CRT aesthetic throughout

### 5. Featured
- 5 curated hero pieces
- Full-bleed images with parallax
- At least 1 with Living Painting AI personality
- Inquiry modal for originals (not Shopify checkout)

### 6. Shop
- Shopify Storefront API integration
- Products: prints (Printful), sketchbooks, hoodies, backpacks
- Cart + checkout via Shopify

### 7. About
- Michael's story, the 137 philosophy
- "Currently working on" live portal
- Contact / inquiry

## Component Architecture

```
app/
├── layout.tsx          → Root layout, fonts, metadata
├── page.tsx            → The Room (3D scene)
├── gallery/
│   ├── page.tsx        → Gallery grid
│   └── [slug]/page.tsx → Single piece + Living Painting
├── featured/page.tsx   → Featured collection
├── shop/
│   ├── page.tsx        → Product grid
│   └── [handle]/page.tsx → Product detail
├── about/page.tsx      → About
├── 137/page.tsx        → Easter egg / brand story
└── api/
    └── chat/route.ts   → Living Painting AI proxy

components/
├── scene/
│   ├── TheRoom.tsx     → Main 3D scene (R3F Canvas)
│   ├── VintageTV.tsx   → TV model with screen portal
│   ├── Tesseract.tsx   → Interactive golden tesseract
│   ├── Ganesha.tsx     → Ganesha statue model
│   ├── Boombox.tsx     → Vintage boombox model
│   ├── ChalkWalls.tsx  → Equation-covered surfaces
│   └── SacredGeo.tsx   → Procedural sacred geometry objects
├── ui/
│   ├── Nav.tsx         → Navigation (transforms to TV channels)
│   ├── AnkhCursor.tsx  → Kundalini cursor
│   ├── CRTOverlay.tsx  → Scan lines + barrel distortion for inner pages
│   ├── TVTransition.tsx → Channel-switch animation
│   └── LoadingGate.tsx → 137 chalkboard intro
├── gallery/
│   ├── ArtGrid.tsx     → Filterable gallery grid
│   ├── ArtPiece.tsx    → Single piece viewer
│   └── LivingPainting.tsx → AI chat interface
├── shop/
│   ├── ProductGrid.tsx
│   ├── ProductCard.tsx
│   └── Cart.tsx
└── shared/
    ├── Footer.tsx
    └── SEO.tsx

lib/
├── shopify.ts          → Storefront API client
├── anthropic.ts        → Claude API client
├── paintings.ts        → Art data + personality configs
└── animations.ts       → GSAP timeline presets
```

## 3D Scene Details

### Models Needed
- **Vintage TV** — low-poly CRT television (can find on Sketchfab or model in Blender)
- **Ganesha** — stylized statue (Sketchfab)
- **Boombox** — retro 80s style (Sketchfab)
- **Sacred geometry constructions** — procedural (R3F/Three.js)
- **Tesseract** — already built, port from current site
- **Room/environment** — dark void with chalkboard texture planes

### Lighting
- Warm gold key light (matching video aesthetic)
- Cyan/teal fill
- Magenta accent
- Volumetric fog (subtle)
- TV screen emissive glow

### Performance
- GPU tier detection (high/mid/low)
- Lazy load 3D scene
- Fallback: static 137 chalkboard + video for low-end devices
- Preload critical assets during loading screen

## Design Tokens

```typescript
const tokens = {
  colors: {
    gold: '#C9A84C',
    warmGold: '#E8C547',
    black: '#0a0a0a',
    chalk: '#e8e0d0',
    magenta: '#FF006E',
    cyan: '#00FFD1',
    purple: '#7B2FBE',
  },
  fonts: {
    serif: "'Playfair Display', serif",
    mono: "'JetBrains Mono', 'Inter', monospace",
    display: "'Cinzel Decorative', serif", // for 137 branding
  },
  spacing: {
    // Golden ratio scale
    xs: '0.382rem',
    sm: '0.618rem',
    md: '1rem',
    lg: '1.618rem',
    xl: '2.618rem',
    '2xl': '4.236rem',
  },
  animation: {
    duration: {
      fast: '0.3s',
      normal: '0.618s', // φ
      slow: '1.618s',   // φ²
    },
  },
};
```

## CRT TV Aesthetic (Inner Pages)

```css
.crt-container {
  /* Scan lines */
  background: repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0.1) 0px,
    rgba(0,0,0,0.1) 1px,
    transparent 1px,
    transparent 3px
  );
  /* Vignette */
  box-shadow: inset 0 0 150px rgba(0,0,0,0.5);
  /* Slight barrel distortion via border-radius on container */
  border-radius: 12px;
  /* Color fringing on text */
  text-shadow: 0.5px 0 rgba(255,0,0,0.15), -0.5px 0 rgba(0,255,255,0.15);
}
```

## Content Strategy
- Each art piece needs: title, slug, description, medium, year, dimensions, price (if for sale), image(s), UV variant (if exists), personality (if Living Painting)
- Products sync from Shopify
- About page content in MDX or Sanity

## SEO Strategy
- Server-rendered pages (Next.js App Router)
- Structured data (ArtGallery, VisualArtwork, Product schemas)
- OG images per piece
- Sitemap generation
- the37thmove.com canonical URLs

## Phase Plan
1. **Scaffold** — Next.js 15 + Tailwind + R3F + GSAP, deploy to Vercel
2. **Loading Gate** — 137 chalkboard intro
3. **The Room** — 3D scene with TV, tesseract, basic environment
4. **TV Navigation** — Camera dolly + channel switch transition
5. **Gallery** — Art grid inside CRT frame
6. **Living Paintings** — AI personality on featured pieces
7. **Shop** — Shopify integration
8. **About** — Brand story
9. **Polish** — Animations, performance, mobile optimization
10. **Content** — All art cataloged, products in Shopify, personalities written
