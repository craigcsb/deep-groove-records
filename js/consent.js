/* Mock consent manager, modelled on ubs.com's in-house one so the Tags
   setup built against it carries over:

   - Choice cookie `deepgroove_cookie_settings`: dash-separated IDs of the
     categories switched on, like UBS's `ubs_cookie_settings_2.0.4`.
     0 and 1 are always present (functional), 2 = user preference,
     3 = statistics, 4 = marketing. All off = "0-1"; all on = "0-4-3-2-1".
   - No cookie = no choice yet: nothing Adobe runs (the Web SDK default
     consent is "pending" in the Tags extension) and the banner shows.
   - First layer: Agree to all / Decline all / Set preferences. The
     preferences layer has the three toggles (pre-ticked, as on ubs.com)
     plus Agree to all / Save preferences. "Privacy Settings" in the
     footer reopens it.
   - On save it tells Tags (`_satellite.track("deepgroove-consent")`, a
     direct call rule) and the page (`deepgroove:consent` event on
     document, detail = the categories); Tags maps statistics to the Web
     SDK's general consent, as ubs.com does (general=in / general=out).
   - Marketing covers personalisation too (AJO), as UBS's notice files
     Adobe Target under marketing. */

(function () {
  const COOKIE = "deepgroove_cookie_settings";
  const MAX_AGE = 365 * 24 * 60 * 60; // seconds
  const CATEGORY_IDS = { userPreference: 2, statistics: 3, marketing: 4 };
  const ALWAYS_ON = [0, 1];

  function readChoice() {
    const match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    if (!match) return null;
    const ids = decodeURIComponent(match[1]).split("-").map(Number);
    const choice = {};
    Object.keys(CATEGORY_IDS).forEach(function (name) {
      choice[name] = ids.indexOf(CATEGORY_IDS[name]) !== -1;
    });
    return choice;
  }

  function writeChoice(choice) {
    // Descending order like ubs.com ("0-4-3-1"), always-on IDs last.
    const ids = [0].concat(
      Object.keys(CATEGORY_IDS)
        .filter(function (name) { return choice[name]; })
        .map(function (name) { return CATEGORY_IDS[name]; })
        .sort(function (a, b) { return b - a; }),
      ALWAYS_ON.slice(1)
    );
    document.cookie = COOKIE + "=" + ids.join("-") + "; max-age=" + MAX_AGE +
      "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  }

  function announce(choice) {
    document.dispatchEvent(new CustomEvent("deepgroove:consent", { detail: choice }));
    if (window._satellite && typeof window._satellite.track === "function") {
      window._satellite.track("deepgroove-consent", choice);
    }
  }

  function save(choice) {
    writeChoice(choice);
    closeBanner();
    announce(choice);
  }

  const ALL_ON = { userPreference: true, statistics: true, marketing: true };
  const ALL_OFF = { userPreference: false, statistics: false, marketing: false };

  /* ---------- UI ---------- */

  let banner = null;

  function closeBanner() {
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  function firstLayer() {
    return `
      <h2 id="consent-title">Personalize your visit with cookies</h2>
      <p>We use cookies to remember your settings, to understand how the shop is used,
      and to show you records and offers you might be interested in.</p>
      <div class="consent-actions">
        <button type="button" class="btn btn-primary" data-consent="all">Agree to all</button>
        <button type="button" class="btn btn-secondary" data-consent="none">Decline all</button>
        <button type="button" class="btn btn-secondary" data-consent="prefs">Set preferences</button>
      </div>
      <p class="consent-small">You can change your mind at any time with "Privacy Settings"
      at the bottom of every page.</p>
    `;
  }

  function toggle(name, label, help, checked) {
    return `
      <label class="consent-toggle">
        <input type="checkbox" name="${name}" ${checked ? "checked" : ""} />
        <span class="consent-switch" aria-hidden="true"></span>
        <span><strong>${label}</strong><span class="consent-help">${help}</span></span>
      </label>
    `;
  }

  function prefsLayer(current) {
    const c = current || ALL_ON; // pre-ticked on first visit, as on ubs.com
    return `
      <h2 id="consent-title">Personalize your visit with cookies</h2>
      <p>Please choose your preferences. You can change your settings any time by clicking
      "Privacy Settings" at the bottom of any page.</p>
      <form class="consent-prefs">
        ${toggle("statistics", "Statistics", "How the shop is used (Adobe analytics).", c.statistics)}
        ${toggle("userPreference", "User preference", "Remembering your settings.", c.userPreference)}
        ${toggle("marketing", "Marketing", "Personalised offers and ad conversion tracking.", c.marketing)}
        <div class="consent-actions">
          <button type="button" class="btn btn-secondary" data-consent="all">Agree to all</button>
          <button type="submit" class="btn btn-primary">Save preferences</button>
        </div>
      </form>
    `;
  }

  function openBanner(layer) {
    closeBanner();
    banner = document.createElement("div");
    banner.className = "consent-overlay";
    banner.innerHTML = `<div class="consent-panel" role="dialog" aria-modal="true" aria-labelledby="consent-title"></div>`;
    const panel = banner.firstElementChild;
    panel.innerHTML = layer === "prefs" ? prefsLayer(readChoice()) : firstLayer();
    document.body.appendChild(banner);

    panel.addEventListener("click", function (e) {
      const action = e.target.getAttribute("data-consent");
      if (action === "all") save(ALL_ON);
      if (action === "none") save(ALL_OFF);
      if (action === "prefs") openBanner("prefs");
    });
    panel.addEventListener("submit", function (e) {
      e.preventDefault();
      const form = e.target;
      save({
        statistics: form.statistics.checked,
        userPreference: form.userPreference.checked,
        marketing: form.marketing.checked
      });
    });
    const first = panel.querySelector("button");
    if (first) first.focus();
  }

  function addFooterLink() {
    const footer = document.querySelector("footer.site-footer");
    if (!footer) return;
    footer.insertAdjacentHTML("beforeend",
      ' · <button type="button" class="consent-footer-link" data-consent-open>Privacy Settings</button>');
    footer.querySelector("[data-consent-open]").addEventListener("click", function () {
      openBanner("prefs");
    });
  }

  // For the site's own code: has the visitor consented to a category?
  // False before any choice.
  window.deepGrooveConsent = {
    has: function (category) {
      const choice = readChoice();
      return !!(choice && choice[category]);
    },
    choice: readChoice,
    open: function () { openBanner("prefs"); }
  };

  function init() {
    addFooterLink();
    if (!readChoice()) openBanner("first");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
