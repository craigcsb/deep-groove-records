# Tags: consent setup

Maps the site's consent cookie (`deepgroove_cookie_settings`, written by
`js/consent.js`) to the Web SDK, the way ubs.com maps
`ubs_cookie_settings_2.0.4`: statistics on → `general=in`, off →
`general=out` (Adobe consent standard 1.0, which is what produces the
`kndctr_<org>_AdobeOrg_consent=general=in|out` cookie seen on ubs.com).

Cookie format: dash-separated category IDs switched on. `0` and `1` are
always present; `2` user preference, `3` statistics, `4` marketing.
All off = `0-1`, all on = `0-4-3-2-1`. No cookie = no choice yet.

## 1. Web SDK extension

Extensions → Adobe Experience Platform Web SDK → Configure →
**Privacy → Default consent: Pending**. Nothing is sent and no Adobe
cookies are set until a choice is made (as on ubs.com before the banner
is answered).

## 2. Data element `DG - consent general`

Type **Core → Custom Code**, returns `in`, `out`, or nothing (no choice yet):

```js
var match = document.cookie.match(/(?:^|; )deepgroove_cookie_settings=([^;]*)/);
if (!match) return;
return decodeURIComponent(match[1]).split("-").indexOf("3") !== -1 ? "in" : "out";
```

## 3. Rule `Consent – set Web SDK consent`

- **Events**
  - Core → **Library Loaded (Page Top)** — applies a choice made on an
    earlier page.
  - Core → **Direct Call**, identifier `deepgroove-consent` — fired by
    `js/consent.js` when the visitor saves a choice.
- **Condition**: Core → **Value Comparison**, `%DG - consent general%`
  **matches regex** `^(in|out)$` (i.e. a choice exists).
- **Action**: Adobe Experience Platform Web SDK → **Set consent**,
  standard **Adobe**, version **1.0**, general = `%DG - consent general%`.

## 4. Web SDK "On before event send" callback

`tags/web-sdk-on-before-event-send.js` — click-ID capture, only with
marketing consent (ID `4`); otherwise it deletes the click-ID cookie.

## 5. Publish

The site loads the **production** library, so build through Development →
Staging → Production.

## Check

Fresh session (close every incognito window), load any page:

1. Before choosing: no `kndctr_…` cookies, no `interact` requests.
2. "Decline all": `deepgroove_cookie_settings=0-1`,
   `kndctr_…_consent=general=out`, still no `interact` requests.
3. Privacy Settings → Statistics only: `0-3-1`, `general=in`, page views
   flow, no AJO personalisation, no `data.clickIds`.
4. Agree to all: `0-4-3-2-1`; next page view requests AJO surfaces, and
   a URL with `gclid=…` adds `data.clickIds`.
