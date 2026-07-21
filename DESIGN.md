# Design System — Tushar Bhatt Portfolio (v3)

Redesigned per `frontend-design`, `ui-ux-pro-max`, `design-taste-frontend`, `gsap-master`, `motion-framer`.

## Direction
High-tech / editorial dark portfolio. Intentional, asymmetric, motion-led — not a centered "SaaS hero" template.
One true accent (electric mint), one secondary (sky), neutral ice-white ink on near-black. No purple→blue gradients on white, no emoji-as-icons, no Inter-everywhere.

## Type
- Display/Headings: **Space Grotesk** (geom techy) — `700/500`
- Body/UI: **IBM Plex Mono** for labels/HUD + **Inter** for prose (capped usage)
- Scale (rem, 16px base):
  - `--fs-hero: clamp(3.2rem, 9vw, 7.5rem)`
  - `--fs-h2: clamp(2.2rem, 5vw, 4rem)`
  - `--fs-h3: 1.4rem`
  - `--fs-body: 1.05rem` line-height 1.7
  - `--fs-label: 0.8rem` mono, letter-spacing 0.22em, uppercase

## Color tokens (in :root)
- `--bg #06080d`  `--bg-2 #0a0e16`  `--ink #eef3fb`  `--muted #8b97a8`
- `--accent #2bf5b0` (mint)  `--accent-2 #54c7ff` (sky)  `--line rgba(255,255,255,.1)`
- Avoid pure #000 text → ink is #eef3fb on near-black.

## Spacing (8px base)
`--s1 8 --s2 16 --s3 24 --s4 40 --s5 64 --s6 96 --s7 140`

## Radii / Shadow
`--r 14px --r-lg 24px`   `--shadow 0 30px 80px rgba(0,0,0,.5)`

## Motion
- GSAP + ScrollTrigger. Eases: `power3.out`, `expo.out`. Staggered reveals.
- Three.js particle starfield (capped DPR 1.5–2), cursor glow follows pointer.
- Magnetic buttons on hover. Counters animate on scroll-in.
- **Always** wrap in `gsap.matchMedia()` for `prefers-reduced-motion: reduce` → static fallback.

## Slop we killed
- Centered hero + 2 buttons → asymmetric 2-col hero with HUD visual stage.
- Inter everywhere → Space Grotesk display + IBM Plex Mono labels.
- Emoji icons → SVG icons only.
- 3-col shadow cards → asymmetric editorial cards with hairline borders + sweep.
