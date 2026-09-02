# Deep Groove Records — a learning site for Adobe Web SDK / CJA / AJO

A small, dependency-free mock e-commerce site built specifically to generate
realistic events for Adobe Experience Platform → Customer Journey Analytics
(and, later, Adobe Journey Optimizer). No backend, no build step, no
frameworks — just static HTML/CSS/JS so it deploys anywhere for free,
including GitHub Pages.

This pairs with **`CJA_Hands_On_Build_Guide.md`** in your project — that
doc walks through the AEP/CJA/AJO side; this README covers the site side.

## Pages and what they track

| Page | Fires |
|---|---|
| `index.html` | page view |
| `products.html` | page view |
| `product.html?id=...` | page view + `commerce.productViews` |
| (Add to cart button) | `commerce.productListAdds` |
| `cart.html` | page view |
| `checkout.html` (on load) | page view + `commerce.checkouts` |
| `checkout.html` (Place order) | `commerce.purchases`, then clears cart |

All tracking calls live in `js/site.js` (`trackPageView`, `trackProductView`,
`trackAddToCart`, `trackCheckoutStart`, `trackPurchase`). They all funnel
through `sendXdmEvent()`, which calls `window.alloy("sendEvent", { xdm })`
if the Web SDK is installed, or just logs to the console if it isn't yet —
so the site is fully usable before you've wired anything up, which is
useful for checking the shopping flow itself works before you add tracking.

## Step 1: Add the Web SDK

Follow Build Guide **Phase 1–3** (schema → dataset → Tags property →
datastream → Web SDK extension). At the end of Phase 3 you'll have an
embed code block from Data Collection (Tags → your property →
Environments → the `</>` install icon).

Paste that embed code into the empty comment block in the `<head>` of
**every** HTML file (`index.html`, `products.html`, `product.html`,
`cart.html`, `checkout.html`) — search for:

```html
<!-- =========================================================
     ADOBE WEB SDK EMBED CODE
```

There's no shared header/include in a plain static site, so yes, it's
pasted five times. That's normal for a site this size.

## Step 2: Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g. `deep-groove-records`).
   - **Private repos:** GitHub Pages only builds from a private repo on
     GitHub Pro, Team, or Enterprise — not the free personal plan. If
     you're on Free and want this private, Pages won't build until you
     either upgrade or flip the repo to public. Note also that even a
     Pages site built from a private repo is generally served at a public
     URL — private repo, public page.
2. From this `site/` folder:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source → Deploy from a branch → `main` / `(root)`**.
4. GitHub gives you a URL like `https://<your-username>.github.io/<repo-name>/`
   — that's your public domain. Use it (not `localhost`) when you enter the
   domain in your Tags property (Build Guide Phase 3) and when you set the
   base URL in Assurance sessions (Phase 4).
5. Any time you edit a file locally, `git add . && git commit -m "..." && git push`
   redeploys it — GitHub Pages usually updates within a minute or two.

## Notes on the XDM commerce structure used here

The tracking calls use Adobe's standard commerce event shape:
`commerce.productViews`, `commerce.productListAdds`, `commerce.checkouts`,
`commerce.purchases`, each paired with a `productListItems` array (SKU,
name, priceTotal, quantity). This matches what the **Consumer Experience
Event** field group (added to your schema in Build Guide Phase 1) expects.
If field names in your actual schema differ slightly, check them in
Assurance (Phase 4) against what's arriving in the `Alloy Request` payload,
and adjust `js/site.js` to match — that mismatch-diagnosis is itself good
Domain 3 practice.

## Cross-channel / authenticated identity

The checkout page's optional email field is wired to identity: on "Place
order", `trackPurchase(order, cart, email)` in `js/site.js` hashes the
email (SHA-256, lowercased + trimmed, via the native SubtleCrypto API) and
sends it as an `identityMap` alongside the `commerce.purchases` event:

```js
window.alloy("sendEvent", {
  xdm: { ...xdmPayload },
  identityMap: {
    Email: [{ id: hashedEmail, authenticatedState: "ambiguous", primary: true }]
  }
});
```

`authenticatedState` is `"ambiguous"` rather than `"authenticated"` since
this is a typed-in guest-checkout field, not a real login — useful for
Build Guide Phase 6 identity-stitching exercises as-is. If you later add a
real login flow, capture the email at sign-in instead (and set
`authenticatedState: "authenticated"`), and consider persisting it
(localStorage) so it's attached to page-view events too, not just the
purchase event.

The email is only ever hashed client-side — the raw address never leaves
the browser.

## Design system note

The visual redesign runs on `css/modernist.css` (a standalone design-token
stylesheet — colors, spacing, type) with `css/style.css` layered on top for
page-specific layout. Product covers live in `assets/covers/` and are real
album artwork — fine for local/private use; worth swapping for placeholder
art if this ever goes fully public.
