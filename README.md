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
| `index.html` | page view (+ requests the AJO ad-offer surface) |
| any page with `?utm_campaign=...` and/or `?gclid=...` | page view also carries `marketing.*` |
| `landing.html` | page view (+ requests the AJO `#landing-hero` surface) |
| (AJO ad offer rendered / clicked) | `decisioning.propositionDisplay` / `decisioning.propositionInteract` |
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

## Ad click-through personalisation (AJO code-based experience)

- **Capture:** when a page loads with `gclid` and/or `utm_campaign` in the URL,
  the page view adds `marketing.trackingCode` (gclid), `marketing.campaignName`
  (`utm_campaign`, the per-ad key) and `marketing.campaignGroup` (`utm_source`),
  each only when present. The schema
  needs the field group that provides `marketing.*` — add it before deploying,
  or those events fail validation. Set the Google Ads final URL suffix to e.g.
  `utm_source=google&utm_medium=cpc&utm_campaign=<ad-key>`.
- **Audience:** two single-event Edge audiences (Edge Merge Policy, 24h
  window) — "ad click-through" (`marketing.campaignName = <ad-key>` and
  `marketing.trackingCode` exists) and "purchased" (`commerce.purchases.value`
  exists) — combined as a third Edge audience: in click-through AND NOT in
  purchased. Don't exclude purchase *events* inside the click-through
  audience instead: that qualifies people but doesn't reliably remove them.
  New or edited Edge audiences take up to an hour before AJO uses them.
- **Delivery:** pages with a `[data-ajo-surface="#ad-offer"]` element (currently
  `index.html`) request the page-relative surface `#ad-offer`, which the Web
  SDK expands to e.g.
  `web://craigcsb.github.io/deep-groove-records-staging/index.html#ad-offer`.
  The AJO code-based experience channel configuration uses Web → "Pages
  matching rule" (domain `craigcsb.github.io`, path starts with
  `/deep-groove-records-staging/`) with location on page `ad-offer`, and a
  campaign targets the audience with HTML content. `renderPropositions()` injects
  it and sends display/interact events (`_experience.decisioning`). The
  datastream needs Adobe Journey Optimizer, Edge Segmentation and
  Personalization Destinations enabled, and the merge policy Active-On-Edge.

## Landing page variants (`landing.html`, AJO code-based JSON)

`landing.html` has a hero (image, kicker, headline, paragraph, CTA) that
changes by `utm_campaign`, above a section that's the same for everyone.
The hero element requests the surface `#landing-hero`; the HTML holds a
default hero, hidden until AJO answers (or for at most 2s, after which the
default shows and a late answer is ignored).

- **Which variant:** the visit's `utm_campaign`, or — on a return visit
  to the landing page without one — the last campaign whose variant was
  actually shown, kept in the first-party cookie `deepgroove_last_campaign`
  (30 days, refreshed each time it's shown; set from the variant JSON's
  `campaign` key, which must match `[A-Za-z0-9_-]{1,64}`). A campaign with
  no variant (typo, untagged ad, not built yet) shows the default and
  leaves the remembered variant alone. Either way the campaign is sent as
  `marketing.campaignName` on the landing page view. Other pages never send
  the remembered value. In a client build the cookie is personalisation
  storage and should follow their consent tool.
- **AJO (Decisioning):** one code-based channel configuration (Web → Pages
  matching rule, location on page `landing-hero`, format **JSON**) and
  **one** campaign. Its decision has one item per variant (attributes:
  campaign, imageUrl, imageAlt, kicker, headline, paragraph, ctaText,
  ctaUrl), each with an eligibility rule on the request's context data
  `marketing.campaignName = <utm value>`; the campaign's JSON is a template
  outputting the chosen item's attributes. A new campaign month = a new
  item + rule, no site or channel change. Don't use one campaign per
  variant with overlapping audiences: a visitor who clicks several ads
  qualifies for all of them and AJO serves the highest-priority campaign,
  not the latest click.
- **Test URL:** `landing.html?utm_campaign=jazzWeek` (no `gclid` needed);
  then `landing.html` alone should keep the jazz variant.
- **JSON contract** (all keys optional; a missing or empty key keeps the
  default; values are HTML-entity-decoded, since AJO's template language
  escapes them):

  ```json
  {
    "campaign": "jazzWeek",
    "imageUrl": "assets/landing/jazz.svg",
    "imageAlt": "Blue record over diagonal hairlines",
    "kicker": "Jazz week",
    "headline": "Blue notes, pressed fresh.",
    "paragraph": "Seven days of jazz pressings, from hard bop to late-night ballads.",
    "ctaText": "Shop the jazz crate",
    "ctaUrl": "products.html"
  }
  ```

  The object may also arrive as a JSON string (e.g. when the template
  outputs a decision item's expression fragment holding the JSON); the
  site parses it. Text is set as plain text, never HTML. `imageUrl`/`ctaUrl` must be
  relative or `https://`. `campaign` should equal the variant's
  `utm_campaign`: if a visitor qualifies for several variants, the one
  matching the current URL wins. Placeholder images for three variants
  live in `assets/landing/` (`jazz.svg`, `rock.svg`, `soul.svg`).

## Cross-channel / authenticated identity

The checkout page's optional email field is wired to identity: on "Place
order", `trackPurchase(order, cart, email)` in `js/site.js` hashes the
email (SHA-256, lowercased + trimmed, via the native SubtleCrypto API) and
sends it as an `identityMap` field on the XDM payload of the
`commerce.purchases` event (identityMap is part of the XDM ExperienceEvent
schema, not a `sendEvent` command option — passing it as a sibling of `xdm`
gets rejected by the SDK with `'identityMap': Unknown field`):

```js
window.alloy("sendEvent", {
  xdm: {
    ...xdmPayload,
    identityMap: {
      Email_LC_SHA256: [{ id: hashedEmail, authenticatedState: "ambiguous", primary: true }]
    }
  }
});
```

The namespace is `Email_LC_SHA256` ("Emails (SHA256, lowercased)"), AEP's
standard namespace for hashed emails. Don't send the hash under the plain
`Email` namespace, which expects a real address: purchase events carrying a
hash there were dropped during testing. Hashes sent before this change sit
under `Email` and won't link to the new ones.

`authenticatedState` is `"ambiguous"` rather than `"authenticated"` since
this is a typed-in guest-checkout field, not a real login — useful for
Build Guide Phase 6 identity-stitching exercises as-is. If you later add a
real login flow, capture the email at sign-in instead (and set
`authenticatedState: "authenticated"`), and consider persisting it
(localStorage) so it's attached to page-view events too, not just the
purchase event.

The email is only ever hashed client-side — the raw address never leaves
the browser.

**Note for when you get to AJO (Build Guide Phase 6+):** hashing is a
one-way operation — AEP can't "unhash" it, and neither can anything else.
What the Identity Service actually does with it is match-by-comparison: it
stitches identities together whenever it sees the same hash string again,
without ever needing the plaintext. That's the right call here, and it's
what external ad/matching destinations (Meta/Google Customer Match, clean
rooms) expect. But it also means:

- In CJA, this identity reports as the raw hash string, not a readable
  email. A human-readable value would have to come from a separate
  Profile/CRM dataset carrying both, joined via the identity graph.
- **AJO can't send an email to a hash.** If a later phase wants Journey
  Optimizer to actually message this person, the hashed `identityMap`
  value here isn't enough — you'd need the *real* address available too,
  either as an unhashed `Email` identity or as a Profile attribute (e.g.
  `personalEmail.address`), sent alongside or instead of the hash
  depending on the use case.

## Design system note

The visual design runs on `css/modernist.css` (a standalone design-token
stylesheet — colors, spacing, type, the `.disc-*` label component) with
`css/style.css` layered on top for page-specific layout. Direction: "Test
Pressing / White Label" — kraft/bone paper, one rubber-stamp red accent, a
stamped monospace face for catalog numbers and labels, a plain grotesk for
reading. Full contract in `.impeccable/surfaces/storefront.md`.

Product "covers" are generated, not photographed: `discMarkup()` in
`js/site.js` draws each record as a die-cut test-pressing label (sleeve,
groove rings, spindle hole, catalog number) from the product's `color` and
`sku` fields. There is no `assets/covers/` art anymore — the site previously
used real album artwork there, which was removed since this is meant to stay
a private/local demo and shouldn't ship real copyrighted covers.
