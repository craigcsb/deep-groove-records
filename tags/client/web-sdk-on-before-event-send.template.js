/* Ad click-ID capture for event forwarding to the Conversions APIs
   (Meta, LinkedIn, Google) — client template.

   WHERE: Adobe Tags → Extensions → Adobe Experience Platform Web SDK →
   Configure → Data collection → "On before event send callback".
   If the property already has callback code, ADD this to it (before any
   `return` in the existing code) rather than replacing it.

   WHAT IT DOES (settings in CONFIG below):
   1. Every event: removes ad click-ID parameters from the page and
      referrer URLs in XDM, so click IDs aren't stored in AEP/CJA.
   2. Every event: data.consent = { statistics, marketing } from the
      consent manager's cookie, for the event forwarding consent check.
   3. With marketing consent only (otherwise the click-ID cookie is
      deleted and nothing else runs):
      - page view with click IDs in the URL: stores them in a first-party
        cookie (latest click per platform, ID_MAX_AGE_DAYS) and adds them
        to the event (clickIdSource "url");
      - page view on a landing page without them: adds the stored ones
        (clickIdSource "cookie") — the retargeting pool;
      - conversion event: adds the stored ones.
      Events with click IDs also get data.eventId (dedup), data.userAgent
      and data.fbp (Meta's _fbp cookie, if present).
   Everything goes in the Web SDK `data` object: event forwarding reads
   it as arc.event.data.*; it is not written to AEP datasets. */

/* ===================== CONFIG — confirm each value ===================== */
var CONFIG = {
  // Consent manager cookie. Seen on ubs.com as ubs_cookie_settings_2.0.4
  // with dash-separated category IDs (e.g. "0-4-3-1"). The pattern allows
  // the version suffix to change.
  CONSENT_COOKIE_PATTERN: /(?:^|; )ubs_cookie_settings_[0-9.]+=([^;]*)/,
  CONSENT_SEPARATOR: "-",
  STATISTICS_ID: "3",   // seen on ubs.com — confirm
  MARKETING_ID: "4",    // seen on ubs.com — confirm

  // First-party cookie holding the click IDs. TODO: agree the name.
  ID_COOKIE: "TODO_click_ids",
  // Cookie domain, e.g. ".ubs.com" if the landing page and the conversion
  // are on different subdomains; "" = current host only.
  ID_COOKIE_DOMAIN: "",
  ID_MAX_AGE_DAYS: 90,  // longest attribution window

  // Landing pages that count for the retargeting pool. TODO: real paths.
  LANDING_PAGE: /TODO-landing-path/,

  // XDM eventType(s) of the conversion (lead form submit). TODO: confirm
  // what the form sends; web.formFilledOut is the standard XDM value.
  CONVERSION_EVENT_TYPES: ["web.formFilledOut"],

  PAGE_VIEW_EVENT_TYPE: "web.webpagedetails.pageViews",
  CLICK_ID_PARAMS: ["gclid", "gbraid", "wbraid", "fbclid", "li_fat_id"]
};
/* ====================================================================== */

var VALID = /^[A-Za-z0-9._~-]{1,512}$/;
var MAX_AGE = CONFIG.ID_MAX_AGE_DAYS * 24 * 60 * 60;
var cookieAttrs = "; path=/" + (CONFIG.ID_COOKIE_DOMAIN ? "; domain=" + CONFIG.ID_COOKIE_DOMAIN : "");

var readCookie = function (name) {
  var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
};

var consentMatch = document.cookie.match(CONFIG.CONSENT_COOKIE_PATTERN);
var categories = consentMatch ? decodeURIComponent(consentMatch[1]).split(CONFIG.CONSENT_SEPARATOR) : [];
var hasMarketing = categories.indexOf(CONFIG.MARKETING_ID) !== -1;

// 1. Strip click IDs from the URLs stored in XDM.
var stripClickIds = function (url) {
  if (!url) return url;
  try {
    var parsed = new URL(url);
    var changed = false;
    CONFIG.CLICK_ID_PARAMS.forEach(function (name) {
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
  statistics: categories.indexOf(CONFIG.STATISTICS_ID) !== -1,
  marketing: hasMarketing
};

// 3. Click IDs (marketing consent only).
var eventType = content.xdm && content.xdm.eventType;
var isPageView = eventType === CONFIG.PAGE_VIEW_EVENT_TYPE;
var isConversion = CONFIG.CONVERSION_EVENT_TYPES.indexOf(eventType) !== -1;

if (!hasMarketing) {
  if (readCookie(CONFIG.ID_COOKIE) !== null) {
    document.cookie = CONFIG.ID_COOKIE + "=; max-age=0" + cookieAttrs;
  }
} else if (isPageView || isConversion) {
  var readStored = function () {
    var ids;
    try {
      ids = JSON.parse(readCookie(CONFIG.ID_COOKIE) || "{}") || {};
    } catch (e) {
      return {};
    }
    var oldest = Date.now() - MAX_AGE * 1000;
    Object.keys(ids).forEach(function (name) {
      var id = ids[name];
      if (CONFIG.CLICK_ID_PARAMS.indexOf(name) === -1 || !id || !VALID.test(id.value) || !(id.clickTime > oldest)) {
        delete ids[name];
      }
    });
    return ids;
  };

  // Meta wants fbc as fb.1.<click time ms>.<fbclid>.
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
    var params = new URLSearchParams(window.location.search);
    var now = Date.now();
    CONFIG.CLICK_ID_PARAMS.forEach(function (name) {
      var value = params.get(name);
      if (value && VALID.test(value)) ids[name] = { value: value, clickTime: now };
    });
    if (Object.keys(ids).length) {
      source = "url";
      var merged = readStored();
      Object.keys(ids).forEach(function (name) { merged[name] = ids[name]; });
      document.cookie = CONFIG.ID_COOKIE + "=" + encodeURIComponent(JSON.stringify(merged)) +
        "; max-age=" + MAX_AGE + cookieAttrs + "; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
    } else if (CONFIG.LANDING_PAGE.test(window.location.pathname)) {
      ids = readStored();
      source = "cookie";
    }
  } else {
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
