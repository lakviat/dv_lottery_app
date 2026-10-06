# DV Lottery Tracker — Expo + native iOS prototypes

An iPhone and iPad companion for preparing a Diversity Visa entry, managing family photos, and keeping a history of submitted entries. The app is named **DV Lottery Tracker**.

The **Expo / React Native preview** runs from the repository root in Expo Go. The original **SwiftUI app** remains in `DVLottery/` with its Xcode project. They are separate implementations with separate local storage; they do not synchronize records.

For standalone iOS beta builds, see [TestFlight setup and test notes](docs/TESTFLIGHT.md).

## App branding

**DV Lottery Tracker** uses the approved white eagle, five stars and open circular ring over navy and red-and-white stripes on the home-screen icon, launch screen, opening state, app header, welcome tour and About screen. The original SwiftUI prototype shares the artwork and display name, including its privacy cover.

- `assets/branding/icon-source.png`: the 1024 × 1024 opaque sRGB master, prepared from the user's artwork with the authorized removal of its surrounding mockup background and shadow; provenance and export instructions are in `assets/branding/README.md`.
- `assets/branding/icon.png`: opaque 1024 × 1024 app icon. iOS applies the corner mask.
- `assets/branding/mark.png`: transparent rounded mark used within the app and by `expo-splash-screen`.
- Run `swift scripts/generate_icon.swift` from the repository root to export all Expo and SwiftUI asset copies from the master.
- Regenerate the Expo iOS project through the existing prebuild workflow to refresh its generated native AppIcon and splash image sizes before building.

Reload Expo Go to see the in-app branding. Installing a rebuilt iOS app is required to change the installed home-screen name/icon and native splash configuration. Expo Go retains its own home-screen icon. The Expo slug, iOS bundle identifiers and storage keys remain stable so existing drafts and saved records are retained when updating the same app. The native splash dismisses normally; no artificial loading delay has been added.

Current logo previews from the standalone Release app: [iPhone 15](docs/screenshots/iphone15-eagle-welcome.png) and [iPad](docs/screenshots/ipad-eagle-welcome.png).

## Consumer experience

The shared visual system lives in `expo-app/theme.ts` and `expo-app/ui.tsx`.
`formNavigation.tsx` provides the same inline-error, first-invalid focus,
keyboard and sticky-action behavior across preparation and modal forms. Home
uses the existing checklist rules to show progress and the next useful action.

Country matching is bundled locally in `countryNormalization.ts`; scanning
never infers birthplace or eligibility from nationality. The approved artwork
uses shared assets across the app; see [branding instructions](assets/branding/README.md).

## Run in Expo Go

Use Node 22.13+ or Node 24.3+ (`nvm use` selects the checked-in Node 24 preference) and an Expo Go version compatible with **Expo SDK 57**. Android and web are outside this prototype’s scope.

```sh
npm ci
npm start
```

1. Keep your Mac and iPhone / iPad on the same Wi-Fi network.
2. Scan the terminal QR code using the iOS Camera app and choose **Open in Expo Go**. No Expo account or API key is required for the local preview.
3. Keep the terminal running. Edits reload through Fast Refresh.
4. To use an iOS simulator, press **i** in the terminal or run `npm run ios`.

If a network blocks device-to-Mac traffic, use `npx expo start --go --tunnel` and follow Expo’s prompt to install its tunnel helper. A tunnel is optional; it is not needed for the normal LAN workflow. If Metro is already running, reuse its displayed URL rather than starting a second instance.

The Expo preview includes all four tabs, the three-stage draft (Your details, Photos, Review), camera / system photo-picker preparation, square JPEG export, per-person photo review, saved confirmations, manual status timelines, searchable country pickers, official in-app browser links, and an adaptive iPad layout. Camera capture needs a physical device.

Draft and entry JSON are stored in versioned chunks using Expo SecureStore (iOS Keychain); photo files stay in Expo’s local document directory. Expo Go manages the containing app’s permissions and storage. Use fictional information while testing. The SwiftUI file-protection and backup-exclusion implementation below does not apply to Expo photo files. There is no cloud sync or automatic government status feed.

### Welcome tour

The Expo app opens with a short, four-page welcome tour: getting started without an account, preparing details and photos, saving confirmations after official submission, and privacy / sharing. A visible **Skip tour / End tour** control is available on every page; the final page also has **Get started**. Nothing advances automatically, and no permissions or signup are requested.

Skipping or finishing stores a separate on-device preference, without changing a draft, photos, entries, or the selected tab. To replay from the beginning, open **Settings → How it works**. Guidance can scroll on small screens or with larger text while the exit and navigation controls remain available. The original SwiftUI implementation is unchanged by this Expo tour update.

### Registration alerts and the simpler home

Home now starts with one preparation/resume card, followed by photos, the guide, saved entries and a compact Registration card. The large promotional banner and duplicate resume button are removed. **Home → Registration alerts** (also available in Settings) offers:

- An optional local notification every Monday at 9 AM in the device's local time, with permission requested only after tapping Enable. It is explicitly a reminder to check official dates, not an announcement that registration has opened. It can be turned off and is canceled by Delete all local app data.
- An optional email alert request through the website's existing public Google Apps Script collector. Explicit consent is required; only email/contact-request metadata is sent, never draft/passport/photo records. No account is created. The current collector acknowledges receipt only, so the app says automatic emails are not yet active.
- A refreshable verified-window feed once the upgraded service is deployed, with direct State Department links and an honest fallback for missing dates or connectivity. No October 7 date is assumed.

`npm ci` installs the added `expo-notifications` dependency. Restart Metro after pulling. Local reminders passed in the rebuilt iOS development app (`npm run ios:dev`). The tested Expo Go runtime rejected scheduling; the app displays a development-build message instead of claiming the reminder is on. Older installed development builds also need rebuilding. Expo Go notification permissions belong to Expo Go. Native remote opening push is not implemented.

The server implementation and activation checklist are in [services/registration-alerts/README.md](services/registration-alerts/README.md). **A Git push does not activate email monitoring/delivery.** The existing Apps Script owner must deploy the extension, authorize and install its trigger, then enable sending. Opening dates require review against an official State Department announcement before the worker sends messages. Email requests are separate from local app data; unsubscribe by email link or contact the service to cancel a queued request.

### Expo checks

```sh
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npx expo export --platform ios --output-dir build/expo-export
```

## Passport capture and the iOS development build

Apply now begins with **Take passport photo** / **Choose passport photo**, followed by editable personal, contact and family sections on one details page. The separate eligibility stage is folded into final Review. Birth dates show **MM/DD/YYYY** and accept that format or pasted ISO dates; errors identify individual fields. Existing six-step drafts migrate to the new flow without resetting entries or photos.

The local `modules/passport-reader` module uses [Apple Vision text recognition](https://developer.apple.com/documentation/vision/recognizing-text-in-images). It reads the two passport lines described in [ICAO Doc 9303 Part 4](https://www.icao.int/sites/default/files/publications/DocSeries/9303_p4_cons_en.pdf), validates check digits, and opens an editable review. Only **Use these details** changes the draft. No image or passport data is sent to an OCR provider. The confirmed details are saved with the rest of the draft in the iOS Keychain.

Names, birth date, sex, passport number, issuing authority / nationality codes and expiry are supported for TD3 passports. Users confirm the name split and full birth year because the machine-readable zone does not distinguish first vs. middle names and uses two-digit years. Birthplace, eligibility country, education, contact details, family and a separate DV portrait still need the user's input. Unreadable, damaged or unsupported documents fall back to manual entry; this is not document authentication.

**Expo Go cannot load custom native modules.** The form works there, but scanning requires an [Expo development build](https://docs.expo.dev/develop/development-builds/introduction/):

```sh
npm ci
npm run ios:dev       # creates ios/, builds and opens the simulator app
npm run start:dev     # subsequent sessions, without rebuilding native code
```

For an iPhone / iPad, configure an Apple development team in Xcode and run `npm run ios:dev -- --device`. The committed `expo-build-properties` configuration enables scene support for Xcode 27 / iOS 27 on Expo SDK 57. The generated workspace is `ios/DVLotteryTracker.xcworkspace`; the repository-root Xcode project belongs to the separate SwiftUI prototype. Generated `ios/` files are ignored; the app configuration and local module are committed. Expo Go and the development app have separate storage, so the first development-build launch starts with its own draft.

Keep Node and npm on the same CPU architecture. On this Mac, `/opt/homebrew/bin/node` is arm64 while the nvm Node 24 installation is x64; mixing them causes esbuild errors. For native builds in an iCloud-synced Desktop directory, Xcode may also reject Finder metadata during framework signing. This session built outside that directory using `/tmp/dv-lottery-expo-native` and disabled signing in the local ExpoModulesJSI nested simulator build; that dependency edit is not an app-source change. For repeat builds, prefer a checkout outside iCloud-synced folders.

To exercise the real OCR engine with fictional data on a Mac:

```sh
mkdir -p build
xcrun swiftc modules/passport-reader/ios/PassportTextRecognizer.swift scripts/test_passport_ocr.swift -o /tmp/dv-passport-ocr-test
/tmp/dv-passport-ocr-test build/fictional-passport.png > build/passport-ocr-lines.json
npx tsx scripts/assert_passport_ocr.ts build/passport-ocr-lines.json
```

## Run the original SwiftUI app

1. Open `DVLottery.xcodeproj` in Xcode.
2. Choose the **DVLottery** scheme and an iPhone or iPad simulator.
3. Press **Run**. No packages, server, or API keys are needed.
4. For a physical device, select your Apple development team under Signing & Capabilities and use a unique bundle identifier if necessary. Camera capture requires a physical device.

The checked-in project is ready to open. The optional `scripts/generate_project.rb` rebuilds it using the `xcodeproj` Ruby gem. `scripts/generate_icon.swift` exports the approved raster artwork to the shared app-icon and in-app sizes.

## Original SwiftUI capabilities

- Home dashboard with preparation progress, unconfirmed registration notice, guide, and official resources.
- Six-step local draft: eligibility review, personal / passport readiness, contact, spouse and children, photos, final review.
- Searchable country pickers; validation; per-person photo requirements; saved progress across launches.
- Camera capture and system photo-library import; movable square crop and zoom; 600 × 600 JPEG export under 240 kB; rejects upscaling.
- Photo history, applicant assignment, capture date, explicit user review, six-month recency checks, sharing, and deletion.
- Submitted-entry records with program year, masked confirmation number, duplicate protection, status-check details, and manual event timeline.
- In-app Safari access to official entry, results, instructions, fee schedule, photo rules, passport rule, and visa bulletin.
- Protected local files, exclusion from device/cloud backups, hidden app-switcher content, and local-data deletion.
- Shared approved eagle/flag artwork, adaptive iPad dashboard, empty states, and source-aware copy.

## Boundaries of this prototype

This app **does not submit entries, transfer draft fields to the official form, collect payments, retrieve government status automatically, or certify eligibility/photos**. Users complete official entry and verification steps in the government website opened by the app, then record their confirmation/results. The portal could not be fetched by the research tool; its end-to-end mobile submission flow must be tested when available. No integration agreement or supported government API was established.

The Expo development build can read a passport photo on-device and save confirmed passport details in the local draft. Temporary passport images are deleted after recognition; raw OCR text is not persisted. A fresh app launch clears leftover scan-workspace files. Original images in the user’s Photos library remain theirs to manage. Users still enter passport information and upload required scans on the official site. The original SwiftUI app only tracks passport readiness. The photo date and visual review are user assertions, not automated verification.

The next registration date is unconfirmed. The interface deliberately has no October 7 countdown and does not equate calendar year with DV program year. Source facts are a dated snapshot, not a live feed. The country picker is not an eligibility list.

Local records have no cloud recovery; retain a separate secure copy of official confirmation pages. The app has no app-specific Face ID lock yet. Physical-device camera, full accessibility review, production rule updates, App Store metadata, signing, and deployment remain release work.

## Structure

| Location | Purpose |
| --- | --- |
| `App.tsx`, `expo-app/` | Expo screens, data model, secure local persistence and validation tests |
| `app.json`, `package.json` | Expo SDK 57 configuration and dependencies |
| `DVLottery/App` | Native app entry point, tabs, privacy cover |
| `DVLottery/Models` | Codable records, draft validation, official links |
| `DVLottery/Services` | Local persistence and photo export |
| `DVLottery/Views` | SwiftUI screens and reusable design components |
| `DVLotteryTests` | Validation, family/photo rules, image export, persistence |
| `DVLotteryUITests` | Navigation and workflow checks, screenshot attachments |
| `docs/PRODUCT_REQUIREMENTS.md` | Research, product plan, scope, release criteria |

## Native verification

Run the **DVLottery** scheme’s tests in Xcode, or:

```sh
xcodebuild -project DVLottery.xcodeproj -scheme DVLottery \
  -destination 'platform=iOS Simulator,name=DV Lottery — iPhone 15 (current)' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO test
```

UI tests pass `--ui-testing`, which isolates storage in a temporary test folder, and `--reset-test-data` when starting a new test. They never reset normal application data. Screenshot attachments are kept in Xcode test results.

See `docs/VALIDATION.md` for the recorded verification results and remaining device checks.

## Screen previews

| Screen | iPhone 15 | iPad Air |
| --- | --- | --- |
| Home | [Preview](docs/screenshots/iphone15-home.png) | [Preview](docs/screenshots/ipad-home.png) |
| Apply | [Preview](docs/screenshots/iphone15-apply.png) | [Preview](docs/screenshots/ipad-apply.png) |
| Photos | [Preview](docs/screenshots/iphone15-photos.png) | [Preview](docs/screenshots/ipad-photos.png) |
| My Entries | [Preview](docs/screenshots/iphone15-entries.png) | [Preview](docs/screenshots/ipad-entries.png) |

The [saved-entry example](docs/screenshots/iphone15-saved-entry-example.png) contains fictional UI-test details, stored only in the isolated test environment. The normal app starts without sample entries.

### Expo screen previews

[Home](docs/screenshots/iphone15-expo-home.png) · [Apply](docs/screenshots/iphone15-expo-apply.png) · [Photos](docs/screenshots/iphone15-expo-photos.png) · [My Entries](docs/screenshots/iphone15-expo-entries.png)

The blue floating gear in Expo screenshots is Expo Go’s development-tools overlay, not part of the standalone app.
