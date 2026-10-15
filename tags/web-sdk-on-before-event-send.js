/* Adobe Tags → Extensions → Adobe Experience Platform Web SDK → Configure →
   Data collection → "On before event send callback". Paste the body below
   (Tags provides `content`, the event about to be sent: { xdm, data }).
   This file is the versioned copy; it isn't loaded by the site.
   Follows the UBS POC "Click ID Capture and Conversion APIs" design
   (ConversionTracking_v2): see tags/README.md for the item-by-item map.

   1. Every event: strip ad click-ID parameters from the page and referrer
      URLs in XDM, so click IDs are never stored in AEP/CJA via the URL.
      (The originals are still read from the browser for step 2.)
   2. Every event: data.consent = { statistics, marketing } from the
      consent cookie, for the event forwarding consent check.
   3. Marketing consent only (ID 4 in deepgroove_cookie_settings, the same
      format as ubs.com's ubs_cookie_settings_2.0.4) — otherwise the
      click-ID cookie is deleted and nothing below runs:
      - Page view with click IDs in the URL: remember them in the
        first-party cookie (latest click per platform wins, 90 days) and
        attach them (clickIdSource "url").
      - Page view on a landing page without them in the URL: attach the
        remembered ones (clickIdSource "cookie") — the retargeting pool of
        repeat landing-page visits.
      - Purchase (the conversion): attach every remembered ID.
      Attached events also get a unique eventId (dedup in the Conversions
      APIs), the user agent and Meta's _fbp cookie when present. All of it
      goes in the free-form `data` object: event forwarding reads
      arc.event.data.*, and none of it is written to AEP datasets. */

var COOKIE = "deepgroove_click_ids";
var MAX_AGE = 90 * 24 * 60 * 60; // seconds
var PARAMS = ["gclid", "gbraid", "wbraid", "fbclid", "li_fat_id"];
var VALID = /^[A-Za-z0-9._~-]{1,512}$/;
var STATISTICS_ID = "3";
var MARKETING_ID = "4";
// Pages that count as landing pages for the retargeting pool.
var LANDING_PAGE = /\/landing\.html$/;

var readCookie = function (name) {
  var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
};

var settings = readCookie("deepgroove_cookie_settings");
var categories = settings ? settings.split("-") : [];
var hasMarketing = categories.indexOf(MARKETING_ID) !== -1;

// 1. Strip click IDs from the URLs stored in XDM.
var stripClickIds = function (url) {
  if (!url) return url;
  try {
    var parsed = new URL(url);
    var changed = false;
    PARAMS.forEach(function (name) {
      if (parsed.searchParams.has(name)) {
        parsed.searchParams.delete(name);
        changed = true;
      }
    });
    return changed ? parsed.toString() : url;
  } catch (e) {
    return url;
  }
};
var web = content.xdm && content.xdm.web;
if (web && web.webPageDetails) web.webPageDetails.URL = stripClickIds(web.webPageDetails.URL);
if (web && web.webReferrer) web.webReferrer.URL = stripClickIds(web.webReferrer.URL);

// 2. Consent state for event forwarding.
content.data = content.data || {};
content.data.consent = {
  statistics: categories.indexOf(STATISTICS_ID) !== -1,
  marketing: hasMarketing
};

// 3. Click IDs (marketing consent only).
var eventType = content.xdm && content.xdm.eventType;
var isPageView = eventType === "web.webpagedetails.pageViews";
var isPurchase = eventType === "commerce.purchases";

if (!hasMarketing) {
  if (readCookie(COOKIE) !== null) {
    document.cookie = COOKIE + "=; max-age=0; path=/";
  }
} else if (isPageView || isPurchase) {
  var readStored = function () {
    var ids;
    try {
      ids = JSON.parse(readCookie(COOKIE) || "{}") || {};
    } catch (e) {
      return {};
    }
    var oldest = Date.now() - MAX_AGE * 1000;
    Object.keys(ids).forEach(function (name) {
      var id = ids[name];
      if (PARAMS.indexOf(name) === -1 || !id || !VALID.test(id.value) || !(id.clickTime > oldest)) {
        delete ids[name];
      }
    });
    return ids;
  };

  // Shapes the IDs the way each platform expects them. Meta wants the
  // "fbc" form (fb.1.<click ms>.<fbclid>), as its own pixel would build it.
  var shape = function (ids) {
    var out = {};
    Object.keys(ids).forEach(function (name) {
      out[name] = ids[name].value;
      out[name + "ClickTime"] = new Date(ids[name].clickTime).toISOString();
    });
    if (ids.fbclid) out.fbc = "fb.1." + ids.fbclid.clickTime + "." + ids.fbclid.value;
    return out;
  };

  var ids = {};
  var source = null;
  if (isPageView) {
    // The click itself: the IDs in this URL, also remembered.
    var params = new URLSearchParams(window.location.search);
    var now = Date.now();
    PARAMS.forEach(function (name) {
      var value = params.get(name);
      if (value && VALID.test(value)) ids[name] = { value: value, clickTime: now };
    });
    if (Object.keys(ids).length) {
      source = "url";
      var merged = readStored();
      Object.keys(ids).forEach(function (name) { merged[name] = ids[name]; });
      document.cookie = COOKIE + "=" + encodeURIComponent(JSON.stringify(merged)) +
        "; max-age=" + MAX_AGE + "; path=/; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
    } else if (LANDING_PAGE.test(window.location.pathname)) {
      // A repeat landing-page visit: the retargeting pool.
      ids = readStored();
      source = "cookie";
    }
  } else {
    // The conversion: every remembered ID still inside its window.
    ids = readStored();
    source = "cookie";
  }

  if (Object.keys(ids).length) {
    content.data.clickIds = shape(ids);
    content.data.clickIdSource = source;
    content.data.eventId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    content.data.userAgent = navigator.userAgent;
    var fbp = readCookie("_fbp");
    if (fbp) content.data.fbp = fbp;
  }
}
