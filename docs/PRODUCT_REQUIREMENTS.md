# DV Lottery — product requirements and first build

Research date: **October 5, 2026, America/New_York**. Working name: **DV Lottery**. Platforms: iPhone and iPad only. This repository contains a functioning native prototype, not a production filing service.

## Product purpose

Give an applicant one calm, understandable place to prepare an annual DV entry and keep their submission history. The two primary jobs are **prepare a new entry** and **track existing entries**. Photos connect those jobs through per-person preparation and history.

The supplied USCIS tracker screenshots are visual references only. None of their case numbers, outcomes, dates, or personal details are seed data. Use their clear navigation and status organization, while designing specifically for Department of State DV entries. USCIS receipt tracking and generic NVC processing-time cards do not belong in this MVP.

## Research decisions

| Topic | Finding and product consequence | Source |
| --- | --- | --- |
| Next opening | The referenced commercial site explicitly calls October 7, 2026 a planning estimate. The official entry-period notice reviewed still leaves the opening to a later announcement. Show “official opening unconfirmed”; do not enable an invented countdown or label a new cycle open. | [Reference service](https://greencardapplicationservices.com/), [State Department announcement](https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html) |
| Official submission | Entries belong on the E-DV site within its announced window. Preserve the confirmation page/number. A draft, service request, or locally added record is not a government submission. Duplicate entries are a disqualification risk. | [Submit an entry](https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-submit-entry1.html) |
| Selection checks | Entrant Status Check is the official selection channel. Selection does not guarantee a visa. Keep confirmation identifiers separate from the regional case number a selectee later receives. | [Selection](https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-submit-entry1/diversity-visa-selection-of-applicants.html), [If selected](https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-if-you-are-selected.html) |
| Photo files | Export square 600 × 600 JPEGs no larger than 240 kB. Review age, pose, background, lighting, glasses, and appearance separately. Cropping cannot certify acceptance. Never apply beauty filters or change the subject’s appearance. | [Photo requirements](https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html) |
| Family completeness | Annual instructions require careful spouse/child inclusion, with exceptions. Collect each included person’s name, birth details, sex, and individual photo; make inclusion review explicit. | [DV-2026 instructions, historical baseline](https://travel.state.gov/content/dam/visas/Diversity-Visa/DV-Instructions-Translations/DV-2026-Instructions-Translations/DV%202026%20Plain%20Language%20Instructions%20and%20FAQs.pdf) |
| Passport change | The March 11, 2026 final rule, effective April 10, adds valid passport details and biographic/signature-page scans, subject to limited exemptions. A new release must reconcile the live annual form with this rule. Prototype includes a readiness check and source link; actual details/scans are provided on the official form. | [Official published rule, 91 FR 11891](https://www.govinfo.gov/content/pkg/FR-2026-03-11/pdf/2026-04737.pdf) |
| Fees | Current fee schedule lists $1 registration and $330 per selectee visa application. Older general entry pages still say registration is free. Avoid a “free forever” claim and do not charge the government fee inside the prototype. | [Official fee schedule](https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html) |
| Service example | Useful patterns: guided preparation, human review, family completeness, final approval, confirmation storage. Its paid packages are private service offerings, not official requirements. No private fee model is copied into this app. | [Service requirements](https://greencardapplicationservices.com/requirements.html) |
| Changing policy | News pages can contain amended or superseded guidance. Link to original announcements and retain source dates; do not infer a processing decision from stale generic text. | [Official visa news](https://travel.state.gov/content/travel/en/News/visas-news.html) |

No public integration contract was verified for direct native entry submission or background ESC checks. Research access to the live E-DV portal returned an error. Browser availability, document upload, payment, confirmation saving, and session behavior require direct acceptance testing when the portal is available.

## Navigation and screen requirements

| Section | Primary behavior | Empty / error behavior |
| --- | --- | --- |
| Home | Start/continue preparation; view progress; open photo studio, guide, entries, official resources | Honest zero-progress and no-entry states; dated registration notice |
| Apply | Six steps with editable saved fields, validation, and final review | Missing fields appear inline; no fake submission success |
| Photos | Capture/import, position crop, assign applicant, record capture date, review, save/share/delete | Camera-unavailable and permission feedback; decode/export errors; stale-photo state |
| My Entries | Add confirmed submission, search by person/year, view masked confirmation and manual timeline | Reject invalid format and duplicates; opening ESC does not change local status |
| Guide / Settings | Explain stages, fees, sources, privacy and local-data handling | Clear dated information and local-only deletion confirmation |

Preparation steps:

1. **Eligibility review:** country and basis of chargeability, education/work pathway, official rules reviewed. This is not an eligibility verdict; all country names remain selectable.
2. **Personal:** legal names and absent-name options, confirmed date of birth, sex as requested by the official form, city/country of birth, education, passport/page readiness.
3. **Contact:** email, optional phone, mailing address and postal-code exception, residence country.
4. **Family:** marital status; required spouse/children with their details; explicit inclusion review. Changes of marital status flag inconsistent spouse records.
5. **Photos:** one recent, user-reviewed photo per included person.
6. **Review:** revisit incomplete sections; acknowledge draft status; visit official portal; save confirmation after actual submission.

## Data model and state semantics

- `EntryDraft`: one in-progress household preparation file, principal applicant, family, fields, acknowledgments, and current step.
- `Person`: stable UUID connects a person to their photo records. Names are not identity keys.
- `PhotoRecord`: UUID, person UUID, protected JPEG filename, capture date, byte count, composition and previous-use assertions. Multiple photos can be retained for history; old photos never become valid automatically.
- `SavedEntry`: program year, applicant display name, status-check surname/birth year, confirmation, optional selectee case number, submission date, and events.
- `StatusEvent`: user-recorded state, date, note, and provenance explicitly displayed in UI.
- `AppData`: schema-versioned local snapshot. An unreadable store is reported and not overwritten.

Entry statuses are user records: submitted → not selected **or** selected → DS-260 → interview → issued/refused. The UI does not force a legal sequence because applicants may add historical milestones or correct records. Adding a milestone must never be presented as a government update. A future version should support editing/correcting an event with an audit trail and per-field provenance.

Drafts are not attached to a confirmed program year until an authoritative year/window configuration exists. Saved historic records use the year printed on the actual confirmation, not an inferred calendar-to-program mapping.

## Visual direction

Native SwiftUI; dark navy headings, a muted blue secondary color, restrained red, warm date notice, white cards on a cool background. The original icon uses a star and flowing flag stripes; it does not reproduce a competitor icon, federal seal, or agency branding. Home uses an original passport illustration built in SwiftUI. On iPad the dashboard uses two columns while forms retain a readable width. All primary actions have text labels, and status is communicated through text as well as color.

## Privacy and integration architecture

The prototype has no backend, authentication, analytics, ads, notification service, or third-party packages. It stores JSON and photos under Application Support with iOS complete file protection, excludes the folder from backups, and covers content when the app becomes inactive. Import uses the system photo picker; camera permission is requested when the user taps capture. Shares are user initiated. Official browsing uses `SFSafariViewController` with visible government URLs.

Before production, add a deliberate data-recovery strategy, app lock, migration/recovery UX, threat review, device-level privacy tests, and an account/sync design only if desired. Device file protection is not a substitute for an app lock or an independently reviewed encryption design. Do not silently place confirmations, scans, or photos in telemetry or logs.

## Next delivery stages

| Stage | Deliverables | Release condition |
| --- | --- | --- |
| 1 — this prototype | Native design, draft preparation, photo library/crop, entry history, official browser, research | Build and simulator workflow checks; honest integration boundaries |
| 2 — filing readiness | Versioned annual fields/eligibility, passport workflow, official-window configuration, entry-summary export, confirmation-page import, photo composition assistance with explainable limits | Current official instructions reconciled; physical iPhone/iPad camera and browser submission journey verified |
| 3 — reliable tracking | User-scheduled local reminders, dated announcement delivery, selected-case bulletin support, correction history, explicit source provenance | No inferred selection; reminders configured from verified dates or user choice; permitted source access |
| 4 — release | Optional account/recovery, localization, VoiceOver and large-text audit, privacy policy/support, signing, TestFlight/App Store materials | Production privacy review and device acceptance checklist complete |

Do not build an automated CAPTCHA solver, unofficial status scraper presented as official, duplicate submission retry, or a native “Submitted” button without authoritative confirmation evidence. An assisted filing service would need its own explicit authorization, pricing, final-review, confirmation delivery, and operating workflow; that business model is not assumed here.

## Acceptance checklist

- Fresh install shows real empty states without the reference screenshots’ personal data.
- Required draft fields block “Save & continue”; progress survives relaunch.
- Required family members need separate recent photos; missing spouse details are flagged.
- Imported/captured photos can be positioned; exports are JPEG, 600 × 600, ≤240,000 bytes, and do not upscale.
- Technical success is never labeled government-approved; stale or unreviewed photos stay visibly incomplete.
- Saved confirmation numbers are validated against their chosen program year and masked by default.
- Duplicate local records are rejected; manual statuses retain user provenance.
- Opening official pages does not fabricate a status or submission event.
- Deleting a local record/photo removes only app-owned content; delete-all preserves official submissions.
- iPhone 15 portrait and iPad layouts are checked. Landscape, large Dynamic Type, VoiceOver, camera permissions, offline browser, and physical-device camera need release verification.
- Annual dates, fees, passport rules, country list, result dates, and portal functionality are rechecked before any public release.

## Expo preview added October 5, 2026

An Expo SDK 57 / React Native implementation now runs from the repository root for immediate Expo Go testing on iPhone and iPad. It implements the same four-tab product concept and six preparation steps, photo capture / import with square crop and JPEG export, local submitted-entry records, and manual event history. SwiftUI remains a separate implementation. Neither version has an official submission API or automatic status integration.

Expo records use chunked Expo SecureStore writes, with the revision pointer committed after all chunks. Photo files use the Expo document directory. Unlike the native SwiftUI version, Expo photo files do not explicitly set complete file protection or backup exclusion, and the Expo app has no privacy cover or biometric gate. No production-security equivalence is claimed. Annual rules and links are a dated snapshot in each implementation and must be updated together.
