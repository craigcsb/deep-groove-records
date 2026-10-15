# Tags / event forwarding — checklist against the UBS POC document

Versioned copies of everything configured in Adobe Tags and event
forwarding for the conversion-tracking POC ("UBS POC Phase 1 – Click ID
Capture and Conversion APIs", ConversionTracking_v2), and where each item
in that document lives.

| File | What |
|---|---|
| `web-sdk-on-before-event-send.js` | Web SDK extension → "On before event send" callback |
| `consent-setup.md` | Default consent, consent data element and Set consent rule |
| `event-forwarding-setup.md` | Event forwarding data elements, rules, connector mapping |

## Document → implementation

| Document step | Item | Where | Status |
|---|---|---|---|
| 1. Tags capture | Read `gclid`, `gbraid`, `wbraid`, `fbclid`, `li_fat_id` from the URL | callback | Done |
| | Write click ID + capture time to a first-party cookie, 90 days, only with marketing consent | callback | Done |
| | `fbc` = `fb.1.<timestamp>.<fbclid>` | callback | Done |
| | Read `_fbp` if it exists | callback | Done (no Meta pixel on this site, so absent here) |
| 2. Web SDK | Landing page view on every landing visit with a click ID (URL **or** cookie) | callback (`clickIdSource` url / cookie) | Done |
| | Conversion event carries the click IDs | callback (`commerce.purchases`; UBS uses a form submit) | Done |
| | Unique event ID per event | callback (`data.eventId`) | Done |
| | Click IDs, event ID, extras in `data`, not stored in AEP | callback | Done |
| | Only with a click ID and marketing consent | callback + rule conditions | Done |
| | Remove click-ID params from XDM URLs | callback (page + referrer URL) | Done |
| 3. Datastream / EF property | EF property added as a datastream service | datastream | Done (Development) |
| | Meta CAPI, LinkedIn CAPI, Cloud Connector extensions | EF property | Cloud Connector only — the others need accounts |
| | Credentials as Secrets | EF property | Needs accounts |
| | Data elements reading `arc.event.data.clickIds.*` | EF property | Done |
| 4. EF rules | Consent check | `{{EF - marketingConsent}}` condition | Done |
| | Meta: event, event ID, fbc, fbp, user agent, hashed email, no IP | webhook rule; extension mapping in `event-forwarding-setup.md` | Done (webhook) |
| | LinkedIn: conversion rule, li_fat_id, hashed email, event ID | as above | Done (webhook) |
| | Google: click conversion upload via Cloud Connector | as above | Done (webhook) |
| — | Consent manager → Web SDK consent (not in the document) | `consent-setup.md` | Done |

## Differences from the document, on purpose

- **One callback instead of Query String data elements + a page-load
  rule.** The callback runs on every Web SDK event at send time, so the
  landing page view can't go out before the cookie is written (a race the
  rule approach has), and the consent check, cookie, URL cleaning and
  `data` are in one place.
- **`marketing.trackingCode` still holds the gclid** (site code, for the
  AJO "ad click-through" audience), so the gclid *is* stored in AEP on the
  landing page view. Decide whether that audience is needed; if not,
  drop it to match "click IDs pass through without being stored".
- **Event ID is generated per event in the browser.** If a client-side
  pixel is ever added, the same ID must go to both pixel and server event
  for dedup.

## Still to do in Tags

- Point the staging site at the Tags **Staging** library (today both
  sites load the Production library), so Tags changes are tested first.
- With platform accounts: install the Meta and LinkedIn CAPI extensions,
  add Secrets, swap the webhook actions for the platform calls.
