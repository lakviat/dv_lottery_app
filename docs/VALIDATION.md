# Verification record

Date: October 5, 2026. Toolchain: Xcode 27.0 (27A266a). App deployment target: iOS 17.0. The original SwiftUI target has no third-party runtime dependencies. The Expo preview uses SDK 57 and its compatible modules.

## Build and automated checks

| Check | Result |
| --- | --- |
| iOS simulator Debug build | Passed |
| Confirmation format and matching program year | Passed |
| Corrupt local store preserved instead of overwritten | Passed |
| Each included family member requires their own reviewed photo | Passed |
| Required spouse and incomplete family details detected | Passed |
| Persistence round-trip, backup exclusion, local-data reset | Passed |
| Photo export: 600 × 600 JPEG, ≤240,000 bytes, crop bounds, upscaling rejection | Passed |
| Photo recency, future dates, and explicit review flags | Passed |
| iPhone 15: four-tab navigation and validation feedback | Passed |
| iPhone 15: save entry, reveal confirmation, terminate/relaunch, retained record | Passed |
| iPad Air 11-inch (M4): navigation and validation feedback | Passed |
| Info.plist and privacy manifest syntax | Passed |
| Icon: 1024 × 1024 PNG with no alpha channel | Passed |

The final simulator runs use iOS 27.0. An earlier iPhone 17 run also passed the unit tests and navigation test. The first attempt on iOS 18.5 stalled during simulator startup and was interrupted; there is no successful iOS 18.5 runtime claim. An iPad test initially used an iPhone-only tab-bar selector; the test now supports the native iPad floating tabs, and the corrected iPad test passed.

Xcode result bundles are under ignored `build/`, including `Tests-iPhone15-final.xcresult` and `Tests-iPad-final.xcresult`. Verbose automatic diagnostic collection was disabled in final runs after it delayed finalizing an earlier result bundle; test assertions were not disabled.

## Visual checks

Reviewed actual simulator screenshots for Home, Apply, Photos, and My Entries. Corrected an overlapping hero illustration on the iPad dashboard. Final native screenshots are in `docs/screenshots/`; the saved-entry example contains only fictional test data. No personal information from the supplied references is included.

## Not yet verified

- Physical iPhone/iPad camera capture, camera-permission denial/recovery, and end-to-end system photo-picker interaction.
- End-to-end government entry, CAPTCHA, official payment, upload, and confirmation capture. The app currently opens the official portal; no native submission integration is implemented.
- Full annual-rule reconciliation and country eligibility decisions. Passport readiness is a checklist, not a stored scan or exemption determination.
- Face/background/lighting acceptance. File checks and user review cannot certify a photo.
- Minimum-version device execution, landscape and split-screen combinations, comprehensive Dynamic Type/VoiceOver, and localization.
- Device-lock file-protection behavior, app-specific biometric lock, recovery/sync, migration UX, and production security review.
- App Store review, public release metadata, support and privacy-policy publication. Expo signing and internal TestFlight distribution are recorded in `docs/TESTFLIGHT.md`.

No application or personal data was submitted to a government or commercial service during development.

## Expo verification

Expo SDK 57.0.26 / React Native 0.86.3 / React 19.2.3, checked October 5, 2026.

- TypeScript strict check: passed.
- Four domain tests: passed (strict calendar dates, required family fields, per-person photo recency/review, confirmation/program-year/duplicate validation).
- `expo install --check`: compatible dependency versions.
- iOS Hermes bundle export: passed.
- iPhone 15 simulator with Expo Go 57.0.9: four-tab navigation, incomplete-draft feedback, photo-screen rendering and add-entry form opening passed in an opt-in XCTest smoke test. Actual screenshots are `docs/screenshots/iphone15-expo-*.png`. The test closes Expo Go’s development menu before exercising the app.
- Expo iPad simulator smoke attempt: the simulator stopped responding during accessibility inspection and screenshot capture; the run was interrupted. Expo iPad runtime interaction is not verified. The native iPad checks above passed independently.
- `npm ls --all --json`: no dependency-tree problems.
- Expo Doctor: 18 of 21 checks passed. Three checks errored while querying absent legacy packages (`expo-cli`, unimodules, conflicting vector icons), reporting that dependency-tree validation needed Node 16+/npm 8 despite Node 25.6 and modern npm being available. This is recorded as an unresolved doctor-tool limitation, not a fully passing doctor run.
- `npm audit` reports 24 transitive advisories (16 high, 8 moderate) in the Expo/Metro toolchain, including braces, node-forge and uuid paths. Nonbreaking fixes were applied. The suggested forced remedy downgrades Expo to SDK 44 and was not used. Dependency security review remains release work.

The Expo camera, system-picker crop, JPEG sharing, Keychain persistence across force-quit/device-lock, and full filled-form submission-preparation flows still need physical-device testing. The separate SwiftUI tests above do not establish Expo feature correctness. No real government entry was submitted.

To repeat the Expo smoke test, start Metro, install compatible Expo Go into the chosen simulator and open its `exp://` URL, then run:

```sh
TEST_RUNNER_DV_EXPO_UI_TESTS=1 xcodebuild \
  -project DVLottery.xcodeproj -scheme DVLottery \
  -destination 'platform=iOS Simulator,name=DV Lottery — iPhone 15 (current)' \
  -derivedDataPath build -only-testing:DVLotteryUITests/ExpoSmokeTests \
  -parallel-testing-enabled NO -collect-test-diagnostics never \
  CODE_SIGNING_ALLOWED=NO test
```

Expo tests skip by default during the ordinary native suite. Native and Expo stores are separate.

### Welcome tour verification

Checked October 5, 2026 for the Expo implementation:

- TypeScript strict check, the four existing domain tests, and iOS Hermes export passed.
- The iPhone 15 Expo Go test passed navigation through all four pages, Back / Next, exiting from each individual page, replaying from Settings, and finishing with Get started.
- A separate test passed after an explicit Metro reload: the dismissed tour stayed hidden and the app remained accessible.
- Actual screenshots of all four pages were reviewed for readable content and visible exit / navigation controls: `docs/screenshots/iphone15-welcome-1.png` through `iphone15-welcome-4.png`.
- Result bundles: ignored `build/WelcomeTour-final.xcresult` and `build/WelcomeTour-reload.xcresult`. The simulator test hides Expo Go's floating development-tools button so it cannot intercept the app's Settings control.

The tour changes do not modify the original SwiftUI app. Physical-device, iPad, landscape, larger-text and comprehensive VoiceOver tour testing remain outstanding. To repeat the reload check, first dismiss the tour, reload Metro, then run only `ExpoSmokeTests/testWelcomeRemainsDismissedAfterReload` with `TEST_RUNNER_DV_EXPO_RELOAD_TEST=1`.

## Passport capture and Apply correction

Checked October 5, 2026. This change applies to Expo; original SwiftUI application code is unchanged.

- Reproduced the date-format mismatch in the previous validator: a valid `02/04/1987` input failed its ISO-only check. Birth-date input now explicitly displays MM/DD/YYYY, accepts ISO as well, and produces field-specific messages for invalid dates, missing names, sex or birthplace.
- Eleven domain tests passed, including impossible / future dates, all six legacy-step migrations, preservation of existing records, ICAO specimen extraction, check-digit failures, OCR character confusion, conflicting scan results, and preserving birthplace / eligibility / family when importing passport fields.
- TypeScript strict checking and the iOS Hermes export passed. Expo dependency compatibility check passed.
- The actual Apple Vision recognizer and JavaScript parser together recovered every expected field from a generated, clearly marked fictional ICAO specimen image. No real passport was used. Reproduction commands are in README.
- The iOS development build compiled with Xcode 27. `expo-build-properties` scene support was needed for its iOS 27 launch. Simulator ad-hoc signing was required for SecureStore Keychain access; an unsigned simulator app correctly failed to load instead of overwriting records.
- Temporary scanner workspace contained zero files after processing. Passport images and raw OCR text are not saved into records; confirmed passport fields use the existing Keychain store.
- iPhone 15 simulator end-to-end test passed: cancel the photo picker, import the fictional image, review extracted names, confirm autofill, enter `02/04/1987`, complete birthplace / education, and Continue to Contact without validation errors. The test uses the actual native scanner, not an OCR mock.
- Separate UI tests passed after a Metro reload: the imported name, corrected birth date and passport number remained saved; Expo Go displayed its scanner-unavailable message and kept the form accessible.
- Result bundles: ignored `build/Passport-UI-final.xcresult` and `build/Passport-Reload-Go.xcresult`. Reviewed screenshots are `docs/screenshots/iphone15-passport-*.png` and contain fictional specimen data only.

Physical-device camera capture, permission denial / recovery, real-world lighting and document variations, iPad scanning, and a comprehensive accessibility review remain unverified. TD3 passports are supported; damaged, truncated or other document formats may require manual entry. The scanner cannot establish identity, DV eligibility, birthplace, required family members or portrait compliance. Physical-device installation requires Apple signing credentials, which were unavailable on this Mac.

## DV Lottery Tracker branding

Checked October 5, 2026:

- Adopted the selected eagle / circular badge / flag design. The built-in image-generation edit produced the full-bleed master; the committed Swift exporter creates the opaque 1024px home-screen icon and rounded transparent in-app assets from that master. Expo and SwiftUI copies match byte-for-byte.
- Updated all user-facing app names, header and About branding, welcome tour, opening state, native launch artwork and the SwiftUI privacy cover. Bundle IDs, Expo slug, storage keys and data schemas are unchanged.
- TypeScript, all eleven existing domain tests, Expo dependency compatibility and the iOS Hermes export passed.
- The SwiftUI simulator target (including its new launch storyboard) and the Expo iOS development build compiled successfully with Xcode 27. Installed the rebuilt Expo app on iPhone 15 and iPad Air simulators; the built Info.plist reports `DV Lottery Tracker`.
- After clearing the stale Metro preview cache, the iPhone 15 welcome-tour check passed all four pages, Back / Next, every exit, replay and Get started. Reviewed the actual Home and first-page screenshots in `docs/screenshots/iphone15-branding-*.png` for icon rendering and readable full app name. Result: `build/Branding-Tour-Final.xcresult`.
- The same tour interaction check passed on iPad Air 11-inch (M4) in the rebuilt Expo development app. Reviewed `docs/screenshots/ipad-branding-welcome.png`; the full name, icon and controls fit. Result: `build/Branding-iPad.xcresult`. Use `TEST_RUNNER_DV_UI_BUNDLE_ID=com.dvlottery.expo` with the existing tour test to target the development app instead of Expo Go.
- The existing saved-draft test passed after installing the renamed iPhone development app: the fictional imported name, corrected birth date and passport number remained intact. Result: `build/Branding-Data-Retained.xcresult`.

The home-screen name/icon and native splash require a rebuilt installed app; Expo Go retains its own home-screen icon. Final release-build splash timing and physical-device branding remain unverified. Expo documents the preview limitations at https://docs.expo.dev/versions/latest/sdk/splash-screen/.

## Minimal home and registration alerts

Checked October 5, 2026 for the Expo app. The separate SwiftUI prototype is unchanged.

- Removed the promotional hero, introductory slogan and duplicate draft CTA. Home retains one preparation/resume card, photo/guide access, entries and a compact Registration card. Existing draft/entry schemas and storage keys are unchanged.
- Added consent-based email requests to the website's existing public collector and clear separation between a collected request and an active confirmation-based email service. The existing endpoint's read-only GET was verified; no real contact requests or emails were submitted during tests.
- TypeScript strict checking, 15 app/domain tests, seven isolated Apps Script service tests, Expo dependency compatibility and final iOS Hermes export passed. Tests cover legacy collector acknowledgements, date/source validation, private-data payload boundaries, consent, transport failure, email confirmation, unsubscribe authentication, deduplication, quota retry, and official-page changes requiring operator review.
- Rebuilt the Expo iOS development app with `expo-notifications` using Xcode 27. On iPhone 15 simulator, the UI test passed home rendering, opening the alert sheet, permission approval, enabling/canceling the actual native scheduled reminder, and rejecting invalid email/missing consent before network submission. Result: `build/Registration-Alerts-Native.xcresult`. Reviewed actual screenshots in `docs/screenshots/iphone15-alerts-{home,reminder,consent}.png`.
- The installed Expo Go runtime exposed notification APIs and accepted permission, but rejected scheduling with `ERR_NOTIFICATIONS_FAILED_TO_SCHEDULE`. Both weekly and calendar triggers were tried. The native development build succeeded with the calendar trigger. The app now reports the Expo Go scheduling limitation instead of claiming the reminder is enabled; old development builds without the module also remain usable.
- The Expo Go UI check subsequently passed the fallback message, usable alert screen and consent validation: `build/Registration-Alerts-Go-Final.xcresult`.
- Monday reminders are calendar-based at 09:00 device local time, use one stable identifier to avoid duplicates, are optional, and never claim that registration has opened. Notification taps open the alert sheet. Delete-local-data cancels the device reminder; remote email requests require separate unsubscribe/contact.

**Not yet activated:** the Google Apps Script monitoring/email extension in `services/registration-alerts/` requires deployment and owner authorization in the existing notification project. Its live Google runtime, confirmation emails, unsubscribe web forms, source monitoring and delivery have not been tested against production; service tests use mocks. No official registration dates are configured. Monitoring flags source changes to the operator; the operator must verify and publish the official registration window before scheduled opening emails run. This is not instant native remote push.

Physical-device notification presentation, delivery at an actual scheduled time, notification-tap cold launch, iOS permission revocation/recovery and comprehensive iPad/accessibility checks remain to be verified. Payments were not implemented in this change.

## Gold DV logo refresh

Checked October 6, 2026, for version `0.1.0 (2)`.

- Imported the user-approved full-square gold DV/flag PNG directly and embedded the sRGB profile. No artwork regeneration or redrawing was performed.
- Exported the opaque 1024px app icon and transparent-corner 512px in-app mark. Expo and SwiftUI copies match byte-for-byte. All shared header, loading, welcome, About, launch-screen and native privacy-cover references use these assets.
- TypeScript checking, the device Release archive, and simulator Release build passed. The archive reports build `2`, includes `main.jsbundle`, and contains the exact new in-app mark bytes. The generated native launch-screen artwork was visually reviewed.
- The existing welcome-tour navigation/exit/replay test passed against the standalone Release app on both iPhone 15 and iPad Air 11-inch (M4), with zero failures or skips. Result: `build/GoldLogo-Tour.xcresult`.
- Reviewed the captured first-page screenshots for the actual new artwork and layout: `docs/screenshots/iphone15-gold-logo-welcome.png` and `docs/screenshots/ipad-gold-logo-welcome.png`.

Physical-device launch timing remains a TestFlight check. Bundle identifiers, storage keys, and user-data schemas are unchanged.
