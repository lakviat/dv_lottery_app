# DV Lottery — Expo + native iOS prototypes

An iPhone and iPad companion for preparing a Diversity Visa entry, managing family photos, and keeping a history of submitted entries. The working name is **DV Lottery**.

The **Expo / React Native preview** runs from the repository root in Expo Go. The original **SwiftUI app** remains in `DVLottery/` with its Xcode project. They are separate implementations with separate local storage; they do not synchronize records.

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

The Expo preview includes all four tabs, the six-step draft, camera / system photo-picker preparation, square JPEG export, per-person photo review, saved confirmations, manual status timelines, searchable country pickers, official in-app browser links, and an adaptive iPad layout. Camera capture needs a physical device.

Draft and entry JSON are stored in versioned chunks using Expo SecureStore (iOS Keychain); photo files stay in Expo’s local document directory. Expo Go manages the containing app’s permissions and storage. Use fictional information while testing. The SwiftUI file-protection and backup-exclusion implementation below does not apply to Expo photo files. There is no cloud sync or automatic government status feed.

### Welcome tour

The Expo app opens with a short, four-page welcome tour: getting started without an account, preparing details and photos, saving confirmations after official submission, and privacy / sharing. A visible **Skip tour / End tour** control is available on every page; the final page also has **Get started**. Nothing advances automatically, and no permissions or signup are requested.

Skipping or finishing stores a separate on-device preference, without changing a draft, photos, entries, or the selected tab. To replay from the beginning, open **Settings → How it works**. Guidance can scroll on small screens or with larger text while the exit and navigation controls remain available. The original SwiftUI implementation is unchanged by this Expo tour update.

### Expo checks

```sh
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npx expo export --platform ios --output-dir build/expo-export
```

## Run the original SwiftUI app

1. Open `DVLottery.xcodeproj` in Xcode.
2. Choose the **DVLottery** scheme and an iPhone or iPad simulator.
3. Press **Run**. No packages, server, or API keys are needed.
4. For a physical device, select your Apple development team under Signing & Capabilities and use a unique bundle identifier if necessary. Camera capture requires a physical device.

The checked-in project is ready to open. The optional `scripts/generate_project.rb` rebuilds it using the `xcodeproj` Ruby gem. `scripts/generate_icon.swift` renders the original flag icon from vector paths.

## Original SwiftUI capabilities

- Home dashboard with preparation progress, unconfirmed registration notice, guide, and official resources.
- Six-step local draft: eligibility review, personal / passport readiness, contact, spouse and children, photos, final review.
- Searchable country pickers; validation; per-person photo requirements; saved progress across launches.
- Camera capture and system photo-library import; movable square crop and zoom; 600 × 600 JPEG export under 240 kB; rejects upscaling.
- Photo history, applicant assignment, capture date, explicit user review, six-month recency checks, sharing, and deletion.
- Submitted-entry records with program year, masked confirmation number, duplicate protection, status-check details, and manual event timeline.
- In-app Safari access to official entry, results, instructions, fee schedule, photo rules, passport rule, and visa bulletin.
- Protected local files, exclusion from device/cloud backups, hidden app-switcher content, and local-data deletion.
- Original U.S.-flag-inspired icon, adaptive iPad dashboard, empty states, and source-aware copy.

## Boundaries of this prototype

This app **does not submit entries, transfer draft fields to the official form, collect payments, retrieve government status automatically, or certify eligibility/photos**. Users complete official entry and verification steps in the government website opened by the app, then record their confirmation/results. The portal could not be fetched by the research tool; its end-to-end mobile submission flow must be tested when available. No integration agreement or supported government API was established.

Passport readiness is tracked; passport numbers and scans are entered/uploaded directly on the official site. The app does not store passport scans. The photo date and visual review are user assertions, not automated verification.

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
