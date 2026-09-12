---
name: Deep Groove Records
description: Test-Pressing / White Label — a mock record shop styled like a working pressing-plant order, not a mood board.
colors:
  bg: "#f0ede1"
  surface: "#e6ddc6"
  surface-2: "#d6c79d"
  ink: "#211c15"
  accent: "#b6321f"
  accent-deep: "#742013"
  neutral-100: "#faf7ee"
  neutral-900: "#211c15"
typography:
  stamp:
    fontFamily: "Special Elite, ui-monospace, SF Mono, monospace"
    fontSize: "11px–13px"
    letterSpacing: "0.04em–0.06em"
    textTransform: "uppercase (short labels only — never full sentences)"
  heading:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontWeight: 800
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "15px"
    lineHeight: 1.55
rounded:
  sm: "2px"
  md: "2px"
  lg: "3px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.md}"
    typography: "{typography.stamp}"
  stamp-badge:
    textColor: "{colors.accent}"
    rounded: "3px"
    typography: "{typography.stamp}"
---

## Overview

Deep Groove Records is a mock record shop built to generate realistic Adobe Web SDK / CJA / AJO commerce events (see PRODUCT.md). The visual direction — **Test-Pressing / White Label** — refuses the record-store category default (moody dark background, neon, spinning-vinyl hero) and its predictable opposite (bare minimalist white grid). Instead the site reads like a working pressing-plant order: numbered, stamped, exact. Full direction contract: `.impeccable/surfaces/storefront.md`.

Cover art is generated, not photographed: every "cover" is a die-cut test-pressing label (`.disc-*` in `css/modernist.css`, built by `discMarkup()` in `js/site.js`) drawn from the product's `color` and `sku` fields. There is no photographic album art in the project.

## Colors

- **Ground** (`--color-bg`, `#f0ede1`) and **surface** (`--color-surface`, `#e6ddc6`) are kraft/bone paper stock, not a neutral "safe" cream — reinforced by a genuine fractal-noise paper-grain texture on `body`, not a decorative gradient.
- **Accent** (`--color-accent`, `#b6321f`) is a single rubber-stamp red, used sparingly: primary buttons, stamp badges, prices' visual weight, active nav state. This is a Restrained color strategy — one accent, not a full palette — appropriate for a site that mixes Persuade (browse/decide) and Operate (cart/checkout) surfaces.
- Each record's disc label uses its own `color` field as the one place saturated, varied color appears — the catalog reads as a shelf of different pressings, not a monochrome site.
- Full neutral/accent ramps live in `css/modernist.css` (`--color-neutral-100..900`, `--color-accent-100..900`).

## Typography

- **Stamp face** (Special Elite): catalog numbers, SKUs, button labels, table headers, footer, disc label text. Reserved for short labels only — never applied to full sentences (readability floor; the detector's `all-caps-body` check enforces this).
- **Heading/body face** (Archivo, weight 800 for headings): all reading content, including all body copy and long-form text.
- Heading vertical rhythm is deliberately uneven, not a flat repeated value: h1 gets the most breathing room below it, h2 less, h3 less still — see `css/modernist.css`.

## Layout

- `.page-wrap` caps content at 1080px, centered, with responsive padding.
- Hero (`index.html`): two-column grid (copy / die-cut disc frame) above 760px, stacks single-column with a centered, capped-width `h1` below it.
- Product grid: 3 columns desktop, 2 columns ≤760px, hairline dividers between tiles (no card shadows) — reads like a printed catalog sheet, not floating cards.
- Product detail: two-column (cover / info) above 760px, stacks below.
- All grid tracks use `minmax(0, 1fr)`, not bare `1fr` — required so long product titles and catalog numbers can never force horizontal overflow.
- Nav wraps onto two rows below 640px (brand on its own row); the secondary call-center-tool icon link hides at that width to keep Sign In / Cart reachable.

## Elevation & Depth

Minimal: a soft ink-tinted `drop-shadow` under the disc art (like a sleeve lifted off a stack) and under dialogs/modals. No card elevation on product tiles — the paper-catalog language uses hairline dividers instead of shadows to separate items.

## Shapes

- Sharp-to-barely-rounded throughout (`--radius-sm/md: 2px`, `--radius-lg: 3px`) — an exact, cut-paper feel, not soft/app-like.
- The recurring signature shape is the die-cut circle: every disc label, the nav brand mark, and the hero's featured-cover frame use concentric circles (label ring → groove rings → spindle hole).
- Dashed borders (`.stamp-badge`... wait, actually solid outline; dashed used for the order-confirmation ID box and the checkout note) stand in for "printed form" chrome instead of card shadows.

## Components

- **`.disc`** — the generated label art. `disc-label` fill is the product's own color; `disc-cat` prints its SKU with `textLength` forced so any catalog number fits without overflow; `disc-groove` rings and `disc-fold` corner sell "sleeve," not photograph.
- **`.stamp-badge`** — small rotated (-2°), red-outlined catalog tag (`mix-blend-mode: multiply` for an inked-on-paper feel). Short text only.
- **`.btn-primary`** — solid accent fill, stamp-face uppercase label, inset highlight line.
- **`.checkout-note`** — dashed kraft box with a small "Note —" stamp kicker, not a colored side-tab (a side-tab / colored-left-border card was flagged by the detector as a generic AI-slop signature and removed).
- Buttons, inputs, tags, tables, and dialogs all carry over the incumbent class names (`.btn`, `.input`, `.tag`, `.table`, `.dialog`) with this system's tokens — no HTML/JS structure changes were needed beyond the disc component and hero markup.

## Do's and Don'ts

- **Do** keep the stamp face to short labels; **don't** set full sentences or paragraphs in uppercase stamp type (readability).
- **Do** use the accent red sparingly (stamps, primary actions, prices); **don't** let it spread across large fields — this is a Restrained palette by design.
- **Do** add new "cover art" only through `discMarkup()`/`.disc-*`; **don't** reintroduce photographic or real third-party album art (see PRODUCT.md's Evidence on Hand).
- **Do** use `minmax(0, 1fr)` for any new CSS Grid track that holds text; **don't** use bare `1fr` next to unconstrained text content.
- **Don't** touch the Adobe Web SDK embed comment blocks, tracking function calls, or XDM event shapes when applying this system to new pages — they are product truth, not visual surface.
