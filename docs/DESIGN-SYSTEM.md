# 137 Studio ? Design System
# Every subagent MUST read this before touching any code.

## Color Palette (extracted from Michael's art)

### Backgrounds
- --bg-void: #0e0c0a (deepest dark, not pure black)
- --bg-charcoal: #1a1a1e (warm charcoal)
- --bg-steel: #2a2d3a (steel blue-gray)
- --bg-mauve: #3d2a3a (dusty mauve)

### Accent Colors
- --accent-red: #c41230 (blood red ? pyramid eye, power)
- --accent-magenta: #d946a8 (hot magenta ? dripping energy)
- --accent-amber: #d4a030 (amber gold ? sun glow, equations)
- --accent-silver: #c0c0c8 (chrome/silver ? 3D elements)

### Text
- --text-chalk: #e8e4dc (warm chalk white ? primary)
- --text-faded: #a09890 (faded script gray ? secondary)
- --text-glow: #ffffff (pure white ? rare, emphasis only)

### Rules
- NO gold on black. Dead aesthetic.
- NO pure black (#000000). Always warm dark.
- Pull accent colors from the art itself.
- Red is the POWER color ? use sparingly for max impact.
- Chalk white is default text ? feels handwritten.

## Typography

### Fonts
- Display: Cormorant Garamond (elegant, editorial)
- Body: Crimson Text (readable warmth)
- Technical: JetBrains Mono (equations, labels, data)
- Sacred: Cinzel (reserved for "137" brand mark ONLY)

### Scale
- Hero name: 12-15vw (MASSIVE)
- Section headers: 6-8vw
- Body: 1.125rem (18px)
- Labels: 0.75rem, uppercase, letter-spacing 0.15em, JetBrains Mono
- NEVER go small and safe. Go BIG.

## Visual DNA (from Michael's art)
1. Dense handwritten equations/symbols ? IS the texture, not decoration
2. Central sacred geometry focal point ? triangle, eye, cross, mandala
3. Red as power color ? blood red in almost every piece
4. Chalk white on dark surfaces ? bathroom wall energy
5. Tiny human figure before the infinite ? scale contrast, awe
6. Dripping/bleeding elements ? organic meets geometric
7. Layered density ? nothing sparse, rewards close inspection

## Spacing (Golden Ratio)
- Base: 8px
- Scale: 8, 13, 21, 34, 55, 89, 144px

## Animation Principles
- Scroll-driven (GSAP ScrollTrigger with scrub)
- Adaptive speed ? ties to scroll velocity
- Ease: power2.inOut mostly, power4.out for reveals
- Duration: 0.618s base (golden ratio)
- NO auto-playing animations. NO sound.

## Anti-Patterns
- No gradients (art is raw, not polished)
- No rounded corners on art (artifacts, not cards)
- No hover tooltips (corporate)
- No loading spinners (progressive load)
- No center-aligned body text (left-align, editorial)
