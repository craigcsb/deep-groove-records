---
version: 1
slug: "storefront"
primary_target: "storefront"
related_targets: ["index.html","products.html","product.html","cart.html","checkout.html"]
---

## Scope

Full storefront redesign: index.html (Persuade — home), products.html (Persuade — catalog), product.html (Persuade — detail/decide), cart.html (Operate — review), checkout.html (Operate — complete task). call-center-mock.html is a separate internal tool, out of scope.

Audience, job, constraints: the only real "visitor" is the project owner (or a test session) shopping through the flow to generate realistic Adobe CJA/AJO tracking events. Every JS tracking call, XDM event name/shape, and the Web SDK embed comment blocks are locked and must be untouched. Product data (names/artists/prices/SKUs) stays as real album/artist names; only cover art becomes placeholder/generic (no real album artwork). Full layout freedom otherwise.

## Direction contract

THESIS: Refuses the record-store category default (moody dark background, neon, spinning-vinyl hero) and its predictable opposite (bare minimalist white grid). Deep Groove Records instead presents like a working pressing-plant order: numbered, stamped, exact — a real artifact you'd handle, not a mood board.

OWN-WORLD: Palette — bone/off-white ground, kraft-brown secondary surfaces, matte near-black ink, one rubber-stamp red as the sole accent (used sparingly: stamps, active states, price emphasis). Type — a stamped monospace/condensed caps face for catalog numbers, SKUs, and labels; a clean workhorse grotesk for body and long copy. Component language — a die-cut circle (the test-pressing spindle hole) recurs as a framing shape for cover art, badges, and icon buttons; hairline rules read as sleeve-fold creases; buttons render as rubber-stamp shapes (slightly rotated, inked edge) for primary actions. Subtle uncoated-paper grain and stamped-ink imperfection as texture, applied sparingly — never heavy grunge.

STORY: A shopper flips through what feels like real catalog stock — every record has a visible catalog number, feels handled and exact — building trust in the artifact even though the store is a demo. On cart/checkout, the same stamped-label language turns into a clear packing-slip/order-form reading order so the task (review → pay) stays legible.

FIRST VIEWPORT: Home hero reads like a stamped shipping manifest/test-pressing sleeve: large die-cut circular window holding a featured cover, catalog number and "DEEP GROOVE RECORDS" stamped top-left in mono caps, one rubber-stamp-style primary CTA ("Browse the crates" or similar) bottom-left, kraft-toned ground, minimal chrome.

FORM: Candidate 7 of 7 on the audience-world list (ordered by resonance: label spindle sticker, crate-digging genre dividers, liner-note booklet, trade-press chart sheet, jukebox selector strip, mixtape J-card, test-pressing stamp & matrix runout — assigned index 7). Seed key: ebc99174.

FINISH: Unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

None outstanding — direction locked by the user over the standing exit (standard modern storefront), which was declined.
