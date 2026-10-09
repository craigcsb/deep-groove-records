// Shared cart + tracking helpers for the CJA/AJO learning site.
// This file assumes products-data.js is loaded first.

/* ---------- Cart (localStorage-backed, no backend) ---------- */

const CART_KEY = "deepgroove_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(function (item) { return item.id === product.id; });
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: product.id, sku: product.sku, name: product.name, price: product.price, qty: qty });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter(function (item) { return item.id !== productId; });
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartTotal(cart) {
  return cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
}

function cartItemCount(cart) {
  return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
}

function formatPrice(n) {
  return "$" + n.toFixed(2);
}

/* ---------- Disc: the die-cut test-pressing label standing in for cover
   art (see css/modernist.css .disc-*). Every record draws the same sleeve
   and groove rings; only the label ink (product.color) and catalog number
   (product.sku) vary — no photographic covers, on purpose. ---------- */

function discMarkup(product) {
  const cat = (product.sku || "").replace(/-/g, " ");
  // textLength forces every catalog number, short or long, onto the same
  // fitted width — a die-cut label can't overflow its own printed ring.
  return (
    '<svg class="disc" viewBox="0 0 100 100" role="img" aria-label="' + product.name + ' label art">' +
      '<rect class="disc-sleeve" x="0" y="0" width="100" height="100" />' +
      '<polygon class="disc-fold" points="0,0 16,0 0,16" />' +
      '<circle class="disc-groove" cx="50" cy="50" r="35" />' +
      '<circle class="disc-groove" cx="50" cy="50" r="31.5" />' +
      '<circle class="disc-label" cx="50" cy="50" r="28" style="fill:' + product.color + '" />' +
      '<text class="disc-cat" x="50" y="41" text-anchor="middle" textLength="44" lengthAdjust="spacing">' + cat + '</text>' +
      '<circle class="disc-hole" cx="50" cy="50" r="4.5" />' +
      '<text class="disc-stamp" x="50" y="88" text-anchor="middle">33⅓ RPM · TEST PRESS</text>' +
    '</svg>'
  );
}

function updateCartBadge() {
  const badge = document.querySelector("[data-cart-badge]");
  if (badge) {
    badge.textContent = cartItemCount(getCart());
  }
}

/* ---------- Web SDK / Adobe Experience Platform tracking ----------
   Every function below wraps a call to `alloy("sendEvent", { xdm: {...} })`.
   `alloy` is defined by the Data Collection / Web SDK embed code you paste
   into the <head> of each page (see the site README and Build Guide Phase 3).
   Until you've pasted that code in, these calls are safely skipped and
   logged to the console instead, so the site works either way. */

function hasAlloy() {
  return typeof window.alloy === "function";
}

// `options` are extra sendEvent options (e.g. `personalization`) merged in
// beside `xdm`. Returns the sendEvent promise so callers can read
// propositions; with no SDK it resolves to an empty result.
function sendXdmEvent(xdm, options) {
  const crmMap = crmIdentityMap();
  if (crmMap) {
    // Signed in: attach the authenticated CRM ID to every event, not just
    // purchases — that's what makes it a realistic authenticated identity
    // rather than a one-off. It's the strongest identity signal we have, so
    // demote any other identity (e.g. the guest-checkout Email_LC_SHA256) on this
    // event to non-primary rather than leaving two identities flagged primary.
    xdm.identityMap = Object.assign({}, xdm.identityMap, crmMap);
    Object.keys(xdm.identityMap).forEach(function (namespace) {
      if (namespace === "crmId") return;
      xdm.identityMap[namespace] = xdm.identityMap[namespace].map(function (entry) {
        return Object.assign({}, entry, { primary: false });
      });
    });
  }

  if (hasAlloy()) {
    return window.alloy("sendEvent", Object.assign({ xdm: xdm }, options)).catch(function (err) {
      console.warn("[tracking] alloy sendEvent failed:", err);
      return { propositions: [] };
    });
  }
  console.info("[tracking] (alloy not installed yet — would have sent):", xdm);
  return Promise.resolve({ propositions: [] });
}

/* ---------- Identity: email → identityMap ----------
   Emails are hashed (SHA-256, lowercased + trimmed) before they ever leave
   the browser — Adobe's identity graph and any downstream Audience Manager
   / destination matching expect hashed PII, not raw addresses. Uses the
   native SubtleCrypto API, so no extra library is needed; it requires a
   secure context, which GitHub Pages (HTTPS) satisfies. */

async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("");
}

// Returns a Promise<identityMap> for a typed-in checkout email, or null if
// none was given. authenticatedState is "ambiguous" (not "authenticated")
// because this is a guest-checkout field, not a real login.
function emailIdentityMap(email) {
  if (!email || !email.trim()) {
    return null;
  }
  return sha256Hex(email.trim().toLowerCase()).then(function (hashedEmail) {
    return {
      // Email_LC_SHA256 is the standard namespace for hashed emails; the
      // plain "Email" namespace expects a real address, and purchases
      // carrying a hash under it were dropped.
      Email_LC_SHA256: [{ id: hashedEmail, authenticatedState: "ambiguous", primary: true }]
    };
  });
}

/* ---------- Mock authentication (CRM ID) ----------
   No real backend, no password — just enough to demonstrate a genuinely
   authenticated identity (as opposed to the guest-checkout email, which is
   only ever "ambiguous"). The CRM ID is derived deterministically from
   whatever's typed in, so re-"signing in" with the same value always
   resolves to the same ID — useful for repeat-visit identity testing. The
   raw typed value is never sent to AEP, only the derived ID. Requires the
   `crmId` identity namespace to exist in AEP (Identities → Namespaces). */

const CRM_KEY = "deepgroove_crm";

function getCrmSession() {
  try {
    return JSON.parse(localStorage.getItem(CRM_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function crmIdFor(identifier) {
  return sha256Hex(identifier.trim().toLowerCase()).then(function (hash) {
    return "CRM-" + hash.slice(0, 12).toUpperCase();
  });
}

function signIn(identifier) {
  return crmIdFor(identifier).then(function (crmId) {
    localStorage.setItem(CRM_KEY, JSON.stringify({ identifier: identifier.trim(), crmId: crmId }));
    updateAuthUI();
    trackPageView(); // fires immediately with the new identity attached
    return crmId;
  });
}

function signOut() {
  localStorage.removeItem(CRM_KEY);
  updateAuthUI();
}

// Returns an identityMap fragment for the signed-in CRM ID, or null if
// signed out. authenticatedState is "authenticated" — unlike the guest
// checkout email, this represents a real (mock) sign-in.
function crmIdentityMap() {
  const session = getCrmSession();
  if (!session) {
    return null;
  }
  return {
    crmId: [{ id: session.crmId, authenticatedState: "authenticated", primary: true }]
  };
}

function updateAuthUI() {
  const btn = document.querySelector("[data-auth-trigger]");
  if (!btn) {
    return;
  }
  const session = getCrmSession();
  if (session) {
    btn.textContent = "Hi, " + session.crmId + " · Sign Out";
    btn.onclick = signOut;
  } else {
    btn.textContent = "Sign In";
    btn.onclick = openAuthModal;
  }
}

function openAuthModal() {
  if (document.querySelector(".auth-overlay")) {
    return;
  }
  const overlay = document.createElement("div");
  overlay.className = "auth-overlay";
  overlay.innerHTML = `
    <div class="auth-modal">
      <h2>Sign in</h2>
      <p>Mock sign-in — no password, no backend. Illustrates an authenticated
      identity (CRM ID) attaching to every event, unlike the ambiguous guest
      email at checkout.</p>
      <form id="auth-form">
        <div class="field">
          <label for="auth-identifier">Email or username</label>
          <input class="input" id="auth-identifier" placeholder="you@example.com" required />
        </div>
        <div class="actions">
          <button type="button" class="btn btn-secondary" data-auth-cancel>Cancel</button>
          <button type="submit" class="btn btn-primary">Sign in</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closeAuthModal();
    }
  });
  overlay.querySelector("[data-auth-cancel]").addEventListener("click", closeAuthModal);
  overlay.querySelector("#auth-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const identifier = document.getElementById("auth-identifier").value;
    if (!identifier.trim()) {
      return;
    }
    signIn(identifier).then(closeAuthModal);
  });
}

function closeAuthModal() {
  const overlay = document.querySelector(".auth-overlay");
  if (overlay) {
    overlay.remove();
  }
}

function trackPageView() {
  revealPendingAfterTimeout();
  sendXdmEvent(
    Object.assign({ eventType: "web.webpagedetails.pageViews" }, campaignXdm()),
    personalizationOptions()
  ).then(renderPropositions);
}

/* ---------- Campaign click-through (utm + Google Ads gclid) ----------
   utm_campaign is sent whenever present. A gclid identifies one click, not
   one ad, so the "clicked ad X, hasn't bought" audience needs both
   (trackingCode exists AND campaignName = X). Requires the field group
   providing `marketing.*` on the schema.

   Last-variant memory: when an element marked [data-ajo-campaign-context]
   (the landing hero) actually renders a variant, its campaign is kept in a
   first-party cookie (latest wins). A campaign with no variant — a typo,
   an untagged ad, one not built yet — shows the default and leaves the
   remembered variant alone. On those pages a view without utm_campaign
   sends the remembered value as marketing.campaignName, which the AJO
   decision rules read as context data — so a return visit keeps the last
   variant. Other pages never send the remembered value, so campaign
   reporting isn't inflated site-wide. */

const LAST_CAMPAIGN_COOKIE = "deepgroove_last_campaign";
const LAST_CAMPAIGN_MAX_AGE = 30 * 24 * 60 * 60; // seconds
const CAMPAIGN_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function rememberedCampaign() {
  const match = document.cookie.match(new RegExp("(?:^|; )" + LAST_CAMPAIGN_COOKIE + "=([^;]*)"));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value && CAMPAIGN_KEY_PATTERN.test(value) ? value : null;
}

function rememberCampaign(value) {
  document.cookie = LAST_CAMPAIGN_COOKIE + "=" + encodeURIComponent(value) +
    "; max-age=" + LAST_CAMPAIGN_MAX_AGE + "; path=/; SameSite=Lax" +
    (location.protocol === "https:" ? "; Secure" : "");
}

// The campaign this page view is "for": the URL's, or on a campaign-context
// page the remembered one.
function currentCampaign() {
  const fromUrl = new URLSearchParams(window.location.search).get("utm_campaign");
  if (fromUrl) return fromUrl;
  return document.querySelector("[data-ajo-campaign-context]") ? rememberedCampaign() : null;
}

function campaignXdm() {
  const params = new URLSearchParams(window.location.search);
  const marketing = {};
  if (params.get("gclid")) marketing.trackingCode = params.get("gclid");
  if (currentCampaign()) marketing.campaignName = currentCampaign();
  if (params.get("utm_source")) marketing.campaignGroup = params.get("utm_source");
  return Object.keys(marketing).length ? { marketing: marketing } : {};
}

/* ---------- AJO code-based experiences ----------
   Any element with data-ajo-surface="#location" requests that surface on
   page view. Surfaces are page-relative: the Web SDK expands "#location" to
   web://<host>/<path>#location for the current page, which an AJO channel
   configuration ("Pages matching rule" + that location) matches on any site
   page. HTML content is injected into the element; JSON content is handed
   to the page as an "ajo:content" event on the element (detail = the JSON),
   so each page decides how to render it. Elements marked data-ajo-pending
   (default content hidden until the decision is known) are revealed once
   it arrives, or after AJO_DECISION_TIMEOUT_MS if it never does — a late
   decision is then ignored rather than swapping content under the reader. */

const HTML_CONTENT_SCHEMA = "https://ns.adobe.com/personalization/html-content-item";
const JSON_CONTENT_SCHEMA = "https://ns.adobe.com/personalization/json-content-item";
const AJO_DECISION_TIMEOUT_MS = 2000;

function ajoSurfaceElements() {
  return Array.prototype.slice.call(document.querySelectorAll("[data-ajo-surface]"));
}

function personalizationOptions() {
  const surfaces = ajoSurfaceElements()
    .map(function (el) { return el.getAttribute("data-ajo-surface"); })
    .filter(function (surface, i, all) { return all.indexOf(surface) === i; });
  if (!surfaces.length) {
    return {};
  }
  return { personalization: { surfaces: surfaces } };
}

function revealPendingAfterTimeout() {
  setTimeout(function () {
    document.querySelectorAll("[data-ajo-pending]").forEach(function (el) {
      el.removeAttribute("data-ajo-pending");
      el.setAttribute("data-ajo-timed-out", "");
    });
  }, AJO_DECISION_TIMEOUT_MS);
}

function sendPropositionEvent(proposition, eventType, propositionEventType) {
  sendXdmEvent({
    eventType: eventType,
    _experience: {
      decisioning: {
        propositions: [{ id: proposition.id, scope: proposition.scope, scopeDetails: proposition.scopeDetails }],
        propositionEventType: propositionEventType
      }
    }
  });
}

// More than one proposition can come back for a surface (e.g. several
// campaigns target it). JSON items may carry a "campaign" key; the one
// matching this visit's campaign wins, otherwise the first (highest-ranked).
function pickPropositionContent(propositions) {
  const utmCampaign = currentCampaign();
  const candidates = [];
  propositions.forEach(function (proposition) {
    (proposition.items || []).forEach(function (item) {
      // A template that renders nothing (e.g. a decision with no eligible
      // item) can still arrive as whitespace — treat that as no content so
      // the default stays and no display event is counted.
      const content = item.data && item.data.content;
      const hasContent = typeof content === "string" ? content.trim() !== "" : !!content;
      if ((item.schema === HTML_CONTENT_SCHEMA || item.schema === JSON_CONTENT_SCHEMA) && hasContent) {
        candidates.push({ proposition: proposition, item: item });
      }
    });
  });
  return candidates.find(function (c) {
    return utmCampaign && c.item.schema === JSON_CONTENT_SCHEMA && jsonContent(c.item.data.content).campaign === utmCampaign;
  }) || candidates[0] || null;
}

// JSON content normally arrives parsed, but a template that renders a
// fragment (e.g. a decision item's JSON fragment) can arrive as a string.
function jsonContent(content) {
  if (typeof content !== "string") return content;
  try {
    return JSON.parse(content);
  } catch (e) {
    console.warn("[ajo] JSON content could not be parsed:", content);
    return {};
  }
}

function renderPropositions(result) {
  const propositions = (result && result.propositions) || [];
  ajoSurfaceElements().forEach(function (el) {
    if (el.hasAttribute("data-ajo-timed-out")) {
      return;
    }
    const surface = el.getAttribute("data-ajo-surface");
    const match = pickPropositionContent(propositions.filter(function (p) {
      return (p.scope || "").endsWith(surface);
    }));
    if (match) {
      if (match.item.schema === HTML_CONTENT_SCHEMA) {
        el.innerHTML = match.item.data.content;
        el.hidden = false;
      } else {
        const content = jsonContent(match.item.data.content);
        el.dispatchEvent(new CustomEvent("ajo:content", { detail: content }));
        // The variant's own campaign key, so only campaigns that really
        // have a variant are remembered (see campaignXdm).
        const shownCampaign = content && content.campaign;
        if (el.hasAttribute("data-ajo-campaign-context") && typeof shownCampaign === "string" &&
            CAMPAIGN_KEY_PATTERN.test(shownCampaign)) {
          rememberCampaign(shownCampaign);
        }
      }
      sendPropositionEvent(match.proposition, "decisioning.propositionDisplay", { display: 1 });
      // One listener per element; it reports whichever proposition is current
      // (trackPageView runs again on sign-in and may re-render).
      if (!el.ajoProposition) {
        el.addEventListener("click", function (e) {
          if (e.target.closest("a, button")) {
            sendPropositionEvent(el.ajoProposition, "decisioning.propositionInteract", { interact: 1 });
          }
        });
      }
      el.ajoProposition = match.proposition;
    }
    el.removeAttribute("data-ajo-pending");
  });
}

function productToListItem(product, qty) {
  return {
    SKU: product.sku,
    name: product.name,
    priceTotal: +(product.price * (qty || 1)).toFixed(2),
    quantity: qty || 1
  };
}

function trackProductView(product) {
  sendXdmEvent({
    eventType: "commerce.productViews",
    commerce: { productViews: { value: 1 } },
    productListItems: [productToListItem(product, 1)]
  });
}

function trackAddToCart(product, qty) {
  sendXdmEvent({
    eventType: "commerce.productListAdds",
    commerce: { productListAdds: { value: 1 } },
    productListItems: [productToListItem(product, qty)]
  });
}

function trackCheckoutStart(cart) {
  sendXdmEvent({
    eventType: "commerce.checkouts",
    commerce: { checkouts: { value: 1 } },
    productListItems: cart.map(function (item) { return productToListItem(item, item.qty); })
  });
}

function trackPurchase(order, cart, email) {
  const xdm = {
    eventType: "commerce.purchases",
    commerce: {
      purchases: { value: 1 },
      order: {
        purchaseID: order.purchaseID,
        priceTotal: order.priceTotal
      }
    },
    productListItems: cart.map(function (item) { return productToListItem(item, item.qty); })
  };

  const identityMapPromise = emailIdentityMap(email);
  if (identityMapPromise) {
    identityMapPromise.then(function (identityMap) {
      xdm.identityMap = identityMap; // identityMap is an XDM field, not a sendEvent option
      sendXdmEvent(xdm);
    });
  } else {
    sendXdmEvent(xdm);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateCartBadge();
  updateAuthUI();
});
