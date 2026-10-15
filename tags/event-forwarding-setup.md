# Event forwarding setup

Property `craig-demosite-ef` (Data Collection → Event Forwarding), with the
**Core** and **Adobe Cloud Connector** extensions. It's a service on the
site's datastream (Development environment). Events only arrive here with
statistics consent (`general=in`); the rules below also require marketing
consent and click IDs, both set by `tags/web-sdk-on-before-event-send.js`.

## Data elements

All are Core → **Path** → "Read data from the provided path", using the
full path. Reference them in event forwarding as `{{EF - name}}`.

| Name | Path |
|---|---|
| EF - eventType | `arc.event.xdm.eventType` |
| EF - timestamp | `arc.event.xdm.timestamp` |
| EF - pageUrl | `arc.event.xdm.web.webPageDetails.URL` (click IDs already removed) |
| EF - campaign | `arc.event.xdm.marketing.campaignName` |
| EF - clickIds | `arc.event.data.clickIds` |
| EF - clickIdSource | `arc.event.data.clickIdSource` (`url` = the ad click, `cookie` = repeat landing visit or conversion) |
| EF - gclid / gbraid / wbraid | `arc.event.data.clickIds.<name>` |
| EF - fbc | `arc.event.data.clickIds.fbc` |
| EF - li_fat_id | `arc.event.data.clickIds.li_fat_id` |
| EF - fbp | `arc.event.data.fbp` |
| EF - eventId | `arc.event.data.eventId` |
| EF - userAgent | `arc.event.data.userAgent` |
| EF - marketingConsent | `arc.event.data.consent.marketing` |
| EF - orderId | `arc.event.xdm.commerce.order.purchaseID` |
| EF - orderTotal | `arc.event.xdm.commerce.order.priceTotal` |
| EF - emailSha256 | `arc.event.xdm.identityMap.Email_LC_SHA256.0.id` |

## Rules (test version → webhook.site)

Both rules start with the same two conditions (Core → Value Comparison):

1. `{{EF - marketingConsent}}` **Equals** `true` — the consent check.
2. `{{EF - clickIds}}` **Is Truthy** — the visit came from an ad.

### Forward landing page view

3. `{{EF - eventType}}` **Equals** `web.webpagedetails.pageViews`

Action: Cloud Connector → Make Fetch Call, POST, `Content-Type: application/json`:

```json
{
  "type": "landing_page_view",
  "event_id": "{{EF - eventId}}",
  "click_id_source": "{{EF - clickIdSource}}",
  "time": "{{EF - timestamp}}",
  "event_source_url": "{{EF - pageUrl}}",
  "campaign": "{{EF - campaign}}",
  "user_agent": "{{EF - userAgent}}",
  "google": { "gclid": "{{EF - gclid}}", "gbraid": "{{EF - gbraid}}", "wbraid": "{{EF - wbraid}}" },
  "meta": { "fbc": "{{EF - fbc}}", "fbp": "{{EF - fbp}}" },
  "linkedin": { "li_fat_id": "{{EF - li_fat_id}}" }
}
```

### Forward purchase conversion

3. `{{EF - eventType}}` **Equals** `commerce.purchases`

```json
{
  "type": "conversion",
  "event_name": "Purchase",
  "event_id": "{{EF - eventId}}",
  "time": "{{EF - timestamp}}",
  "event_source_url": "{{EF - pageUrl}}",
  "user_agent": "{{EF - userAgent}}",
  "order_id": "{{EF - orderId}}",
  "value": "{{EF - orderTotal}}",
  "currency": "USD",
  "email_sha256": "{{EF - emailSha256}}",
  "google": { "gclid": "{{EF - gclid}}", "gbraid": "{{EF - gbraid}}", "wbraid": "{{EF - wbraid}}" },
  "meta": { "fbc": "{{EF - fbc}}", "fbp": "{{EF - fbp}}" },
  "linkedin": { "li_fat_id": "{{EF - li_fat_id}}" }
}
```

No IP address is sent anywhere (UBS doc, "Data privacy: IP address").

## Production version (needs ad platform accounts)

Replace each webhook action with the platform's call. Credentials go in
event forwarding **Secrets**, never in rules. Field names below are what
each API needs; check them against the extension UI when installing.

| | Meta Conversions API extension | LinkedIn Conversions API extension | Google Ads API (Cloud Connector) |
|---|---|---|---|
| Secrets | Access token | OAuth token | Google OAuth 2 secret + developer token |
| Account setup | Pixel ID | Conversion rule ID (CAPI rule), enhanced conversion tracking on | Customer ID, conversion action ID, auto-tagging on |
| Event | `Lead` / `Purchase` | conversion rule | `uploadClickConversions` |
| Click ID | `fbc` (+ `fbp`) | `li_fat_id` | one of `gclid` / `gbraid` / `wbraid` |
| Dedup | `event_id` = EF - eventId | `eventId` = EF - eventId | `orderId` |
| Other | `action_source: website`, `event_source_url`, `client_user_agent`, hashed `em` if known, `custom_data` value/currency | hashed email if known, value/currency | `conversionDateTime`, value, currency |
| Leave out | IP | — | IP |

Formatting the connectors may need (Core → Custom Code data elements):
Meta `event_time` in Unix **seconds**; Google `conversionDateTime` as
`yyyy-mm-dd hh:mm:ss+00:00` (not ISO `…Z`); empty IDs left out rather
than sent as `null` (the Meta and LinkedIn extensions do this; the custom
Google call must).

Google request shape:

```
POST https://googleads.googleapis.com/v<version>/customers/<customerId>:uploadClickConversions
Authorization: Bearer <OAuth secret>
developer-token: <developer token>
{"conversions":[{"gclid":"…","conversionAction":"customers/<id>/conversionActions/<id>",
  "conversionDateTime":"2026-10-15 13:28:55+00:00","conversionValue":34.99,
  "currencyCode":"USD","orderId":"ORD-…"}],"partialFailure":true}
```
