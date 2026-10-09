/* Adobe Tags → Extensions → Adobe Experience Platform Web SDK → Configure →
   Data collection → "On before event send callback". Paste the body below
   (Tags provides `content`, the event about to be sent: { xdm, data }).
   This file is the versioned copy; it isn't loaded by the site.

   Ad click IDs for event forwarding. Ad platforms' conversion APIs
   (Google Ads, Meta CAPI, LinkedIn CAPI) match a server-side conversion
   to the ad click by its click ID. IDs arriving in the URL are kept in a
   first-party cookie (latest click per platform wins, 90 days) so a
   purchase pages or days later can still carry them. They go in the
   free-form `data` object, not XDM: event forwarding reads them as
   arc.event.data.clickIds, and they're never written to AEP datasets.
   This is marketing storage: it only runs with marketing consent (ID 4 in
   the deepgroove_cookie_settings cookie, set by js/consent.js — the same
   format as ubs.com's ubs_cookie_settings_2.0.4). Without it the click-ID
   cookie is deleted, nothing is captured and nothing is attached. */

var COOKIE = "deepgroove_click_ids";
var MAX_AGE = 90 * 24 * 60 * 60; // seconds
var PARAMS = ["gclid", "gbraid", "wbraid", "fbclid", "li_fat_id"];
var VALID = /^[A-Za-z0-9._~-]{1,512}$/;
var MARKETING_ID = "4";

var settings = document.cookie.match(/(?:^|; )deepgroove_cookie_settings=([^;]*)/);
var hasMarketing = !!settings && decodeURIComponent(settings[1]).split("-").indexOf(MARKETING_ID) !== -1;

var eventType = content.xdm && content.xdm.eventType;
var isPageView = eventType === "web.webpagedetails.pageViews";
var isPurchase = eventType === "commerce.purchases";

if (!hasMarketing) {
  if (document.cookie.indexOf(COOKIE + "=") !== -1) {
    document.cookie = COOKIE + "=; max-age=0; path=/";
  }
} else if (isPageView || isPurchase) {
  var readStored = function () {
    var match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    var ids;
    try {
      ids = match ? JSON.parse(decodeURIComponent(match[1])) || {} : {};
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
  if (isPageView) {
    // The landing: only the IDs from this click, which are also remembered.
    var params = new URLSearchParams(window.location.search);
    var now = Date.now();
    PARAMS.forEach(function (name) {
      var value = params.get(name);
      if (value && VALID.test(value)) ids[name] = { value: value, clickTime: now };
    });
    if (Object.keys(ids).length) {
      var merged = readStored();
      Object.keys(ids).forEach(function (name) { merged[name] = ids[name]; });
      document.cookie = COOKIE + "=" + encodeURIComponent(JSON.stringify(merged)) +
        "; max-age=" + MAX_AGE + "; path=/; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
    }
  } else {
    // The conversion: every remembered ID still inside its window.
    ids = readStored();
  }

  if (Object.keys(ids).length) {
    content.data = content.data || {};
    content.data.clickIds = shape(ids);
  }
}
