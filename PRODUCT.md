# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: static HTML/CSS/JS, no build step, no framework, no backend. Deploys as-is (e.g. GitHub Pages).

## Users

Primary user is the project owner, learning Adobe Experience Platform Web SDK, Customer Journey Analytics, and (later) Adobe Journey Optimizer by building and instrumenting a small e-commerce site. There are no real end customers; the "shopper" browsing/buying is a role the owner (or a test session) plays to generate realistic interaction events.

## Product Purpose

Deep Groove Records is a mock e-commerce site whose real purpose is to generate realistic commerce events (page views, product views, cart adds, checkout starts, purchases) for AEP → CJA (and eventually AJO) exercises. Success means the shopping flow is fully usable end-to-end and every tracked action fires the correct XDM commerce event with the right shape.

## Positioning

Not a real business — there is no competing product to differentiate against. Its "positioning" is purely as a believable-enough storefront that a person could shop through naturally, so the events it generates look like real commerce data rather than synthetic test noise.

## Operating Context

- Pairs with an external `CJA_Hands_On_Build_Guide.md` (Adobe AEP/CJA/AJO setup guide) — this repo is the "site side" of that guide.
- Every HTML page has an empty comment block in `<head>` reserved for the Adobe Web SDK embed code, pasted individually per page (no shared header/include, by design of the guide).
- Deployment target is GitHub Pages (public URL required even from a private repo, per GitHub Pages plan limits).

## Capabilities and Constraints

Pages: `index.html` (home), `products.html` (catalog), `product.html?id=...` (detail), `cart.html`, `checkout.html`, plus `call-center-mock.html` (separate internal tool, not part of the shopper flow).

Tracked actions (must be preserved exactly — event names and XDM shape are load-bearing for the paired build guide):
- Page view on every page
- `commerce.productViews` on product detail
- `commerce.productListAdds` on Add to Cart
- `commerce.checkouts` on checkout load
- `commerce.purchases` on Place Order (then clears cart)
- Page views landing with `?gclid=` also carry `marketing.trackingCode` / `campaignName` / `campaignGroup`
- AJO ad-offer slot (`[data-ajo-slot]` on home): `decisioning.propositionDisplay` / `decisioning.propositionInteract`

All tracking funnels through `sendXdmEvent()` in `js/site.js` (`trackPageView`, `trackProductView`, `trackAddToCart`, `trackCheckoutStart`, `trackPurchase`), calling `window.alloy("sendEvent", { xdm })` when the Web SDK is present, else logging to console — the site must stay fully usable with no SDK installed.

Checkout has an optional guest email field wired to `identityMap` under the `Email_LC_SHA256` namespace (client-side SHA-256 hash only; raw email never leaves the browser) — this identity-stitching wiring must survive any redesign untouched.

A redesign must not remove or rename tracking hooks, event names, XDM field structure, or the Web SDK embed comment blocks, and must not change what data reaches `sendXdmEvent()`.

## Brand Commitments

Name "Deep Groove Records" and the record-store / vinyl concept are confirmed and binding — explicitly kept rather than replaced with a different storefront concept.

## Evidence on Hand

`assets/covers/` currently holds real album artwork (Abbey Road, Dark Side of the Moon, Let It Bleed, Sgt. Pepper's, The Doors, Wish You Were Here) used as product images. Decision: replace with placeholder/generic cover art for this redesign rather than continuing to use real copyrighted artwork — record types/product data can keep their existing names or shift to clearly fictional releases as needed to pair with placeholder art.

## Product Principles

- The tracking/instrumentation layer is the actual product; visual design must never break, obscure, or alter it.
- The shopping flow must stay usable and demonstrable with zero setup (no SDK, no backend).
- Believability as a storefront matters more than commercial polish tropes (no fabricated reviews, pricing gimmicks, or real brand claims).
- Keep the site trivially deployable as static files with no build step.

## Accessibility & Inclusion

No product-specific requirement established; follow standard web accessibility practice during redesign.
