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
- Signing, TestFlight, App Store review, release metadata, support and privacy-policy publication.

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
