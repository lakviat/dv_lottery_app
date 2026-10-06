# DV Lottery Tracker — TestFlight

The TestFlight app is the **Expo / React Native app**, generated into
`ios/DVLotteryTracker.xcworkspace`. The root `DVLottery.xcodeproj` is a separate
SwiftUI prototype and must not be used for this upload.

## Release identity

- Display name: DV Lottery Tracker
- Bundle identifier: `com.dvlottery.expo`
- Apple Developer team: `ZDK3K9BT5S`
- First beta: version `0.1.0`, build `1`

`app.json` is the source of truth for the team and version. Increment
`expo.ios.buildNumber` before each subsequent TestFlight upload. Keep signing
private keys in the macOS Keychain; never commit credentials or provisioning
profiles.

## Build preparation

Use a clean checkout outside iCloud-synced Desktop/Documents folders so synced
file metadata cannot interfere with framework code signing. On this Mac, use
the native Homebrew Node executable by prepending `/opt/homebrew/bin` to PATH.

```sh
npm ci
npm run typecheck
npm test
npx expo prebuild --platform ios --no-install
pod install --project-directory=ios
```

Open the generated workspace in Xcode with the developer account signed in.
Select the DVLotteryTracker scheme and Any iOS Device, then use Product →
Archive with the Release configuration. Distribute the archive through App
Store Connect, then enable the processed build for internal TestFlight testing.
The release must include `main.jsbundle` and run without Metro or Expo Go.

## Beta test notes

No signup is required. Please test:

- The skippable welcome tour and replay from Settings.
- Saving a draft, closing/reopening the app, and continuing preparation.
- Passport import using the camera or photo library, reviewing extracted fields,
  and entering details manually when a scan cannot be read.
- Birth dates, family details, and the three application preparation steps.
- Preparing and reviewing photos for each family member.
- Saving entry confirmations and manually updating their history.
- Enabling/disabling the optional weekly reminder.
- iPhone and iPad layouts, including larger text sizes.

Use fictional details for early testing. This beta prepares and organizes entries;
official submission and result checks use the State Department portal. Payments,
automatic case status updates, and remote opening push notifications are not
implemented. The optional email service currently collects alert requests;
automatic opening emails are not yet activated.

Expo Go data does not migrate into the separate TestFlight installation. Updates
to the same installed native bundle identifier retain its existing local data.

## Publication scope

Uploading a build to TestFlight does not publish an App Store release. Begin with
internal testing for the account owner; external invitations or a public beta
link require a separate distribution decision.
