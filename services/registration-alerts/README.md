# Registration opening email service

**Status: implementation provided, NOT deployed or activated by this app change.** The current public website endpoint is a request collector. The app accepts its existing acknowledgement but explicitly says opening emails are not active. Local Monday reminders work separately.

`Code.gs` is an extension/replacement for the website repository's `scripts/notifications-apps-script.gs`, deployed in the **same Google Apps Script project**. The app and website can keep the existing public `/exec` URL. This repository cannot deploy to that Google project without its authenticated owner access; no deployment credentials are committed. Do not replace the separate payment/intake script.

## Operation

- Incoming contact requests require explicit consent, validation and per-address rate limiting. No application, passport, photo or payment data is accepted by the app's request payload. The public `website` field is a routing check, not authentication.
- An email request receives a confirmation link. Until the recipient confirms with a button, no opening announcement is sent. Email-link scanners visiting GET URLs cannot change subscriptions. Unsubscribe also requires a button; the opaque token authenticates that action.
- The owner installs a 15-minute trigger. It checks official State Department announcement/instructions pages every six hours and alerts `ADMIN_EMAIL` to changes or fetch failures. A changed page never automatically means registration is open.
- The owner checks the official **entry registration** dates, program year and timezone, then publishes `VERIFIED_WINDOW_JSON`. Do not use the October–September visa issuance period or a date mentioned in an old announcement. October 7 is not configured.
- During a published registration window, the trigger emails confirmed subscribers once, within scheduler and daily quota limits. It does not guarantee instantaneous delivery. Messages link to the official announcement and portal, distinguish an opening from selection, and include an unsubscribe link. There is no marketing or automatic renewal.
- A confirmed subscriber waits for the next configured opening. Unconfirmed requests expire after 30 days. Unsubscribed and delivered records are moved to Drive Trash after 30 days; configure Drive retention / empty Trash under the service's privacy policy. Original legacy collector files are not deleted by migration.
- Ordinary runs deduplicate by normalized email and delivered program. MailApp cannot atomically commit a sent email plus a Drive record: a process crash at that boundary can duplicate a message. Use a transactional email provider with idempotency support when scaling.

## Activate with the Google project owner

1. Back up the existing deployed script and properties. Test this code in a **separate staging project/private folder and owner-controlled test inbox** first. The included tests use in-memory mocks and never email anyone.
2. Replace the notification collector's source with `Code.gs`. Preserve `ROOT_FOLDER_ID` and `ALLOWED_WEBSITES` (include `greencardapplicationservices.com,www.greencardapplicationservices.com`). Set `ADMIN_EMAIL` to the service owner's monitored address. Leave `DELIVERY_ENABLED` absent/false and `VERIFIED_WINDOW_JSON` absent. Only use a private Drive root; no public sharing.
3. Run `installRegistrationAlertTrigger` as owner and approve Google's Drive, external HTTP, mail and trigger permissions. It replaces only this handler's triggers and does not turn delivery on.
4. Create a new version in **Deploy → Manage deployments** for the existing web app, executing as the owner and accessible to anyone. Keep the same deployment ID/URL. Check public GET returns `{"ok":true,"version":1,"emailDelivery":false,"window":null}`. A Git push alone does not deploy Apps Script.
5. In staging, set `DELIVERY_ENABLED=true`, request an alert with a controlled inbox, verify that GET of a confirmation link does not subscribe, then confirm using its button. Test unsubscribe. Publish a clearly fictional test window **only in staging**, run the worker twice, and verify one opening email. Exercise unknown/future/closed windows, source fetch failure and exhausted quota.
6. In production, leave the verified window empty until an actual official announcement is reviewed. Set `DELIVERY_ENABLED=true` when the sender, privacy policy and capacity are ready. GET should then report `emailDelivery:true`. Reopen/refresh the app to see the confirmation-based opt-in copy.
7. To import consented website/app requests made before this deployment, run `importLegacyEmailRequests` in batches of 100 until `LEGACY_CURSOR` is absent. It only imports email requests from the last 30 days and requires confirmation; WhatsApp-only requests remain collected without automated delivery. Do not repeatedly reimport unsubscribed/deleted legacy requests. Follow the same consent/retention policy for the old files.
8. Monitor Apps Script Executions, trigger failure emails, remaining mail quota and the administrator inbox. Pause delivery using `DELIVERY_ENABLED=false`; remove or correct the verified window immediately if the government changes it. Update `ANNOUNCEMENTS` when State publishes a new program-specific announcement URL.

The verified window property is JSON with **real verified values**, not placeholders:

```text
program: DV-YYYY
opensAt: ISO-8601 timestamp including Z or numeric UTC offset
closesAt: ISO-8601 timestamp including Z or numeric UTC offset
sourceURL: direct https://travel.state.gov/content/travel/... announcement
verifiedAt: ISO-8601 timestamp of the owner's review
```

No actual registration dates are seeded in this repository. The client validates that the source is the exact official hostname and that the dates describe a bounded entry period. This proves data shape, not the correctness of the owner's review.

## Capacity and release limits

[Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) vary by account; a consumer sender currently has a much lower daily recipient allowance than a paid Workspace account. Both confirmations and opening emails consume it. Reserve capacity before promising opening-day delivery to a large list. This low-volume implementation keeps a continuation cursor and retries on subsequent runs; it stops opening sends at the closing time.

The current public collector has only modest abuse protection. Before public-scale launch add request-origin-independent abuse controls and global sending limits; do not treat the public compatibility token as a secret. Consider moving to an authenticated deployment pipeline, database and transactional email provider for larger lists and auditable deliveries. Review/update the website privacy policy and App Store privacy disclosures for opt-in email processing.

Native remote push is **not included**. It needs an EAS project, Apple/APNs credentials, push token registration/opt-out and a server-side delivery worker. Local date-check reminders must never be advertised as instant remote opening notifications.

Sources: [Google time triggers](https://developers.google.com/apps-script/reference/script/clock-trigger-builder), [State Department announcements](https://travel.state.gov/content/travel/en/News/visas-news.html), [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
