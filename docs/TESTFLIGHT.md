# DV Lottery Tracker — TestFlight

The TestFlight app is the **Expo / React Native app**, generated into
`ios/DVLotteryTracker.xcworkspace`. The root `DVLottery.xcodeproj` is a separate
SwiftUI prototype and must not be used for this upload.

## Release identity

- Display name: DV Lottery Tracker
- Bundle identifier: `com.dvlottery.expo`
- Apple Developer team: `ZDK3K9BT5S`
- First beta: version `0.1.0`, build `1`
- Gold DV logo refresh: version `0.1.0`, build `2`
- App Store Connect app ID: `6819749953`

`app.json` is the source of truth for the team and version. Increment
`expo.ios.buildNumber` before each subsequent TestFlight upload. Local development
signing keys stay in the macOS Keychain. Distribution signing can use Apple's
managed cloud certificate through the signed-in Xcode account. Never commit
credentials or provisioning profiles.

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
The release must include `main.jsbundle` and run without Metro or Expo Go.

For an account without registered development devices, create an unsigned
Release archive and let App Store export apply distribution signing. This avoids
requiring a development provisioning profile just to upload to TestFlight:

```sh
xcodebuild -workspace ios/DVLotteryTracker.xcworkspace \
  -scheme DVLotteryTracker -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ../DerivedData \
  -archivePath ../DVLotteryTracker-unsigned.xcarchive \
  CODE_SIGNING_ALLOWED=NO archive
```

Use an export options plist containing `method = app-store-connect`,
`destination = upload`, `teamID = ZDK3K9BT5S`, `signingStyle = automatic`,
`manageAppVersionAndBuildNumber = false`, and `uploadSymbols = true`:

```sh
xcodebuild -exportArchive \
  -archivePath ../DVLotteryTracker-unsigned.xcarchive \
  -exportPath ../Upload -exportOptionsPlist ../UploadOptions.plist \
  -allowProvisioningUpdates
```

The uploaded app is distribution-signed; the intermediate archive alone is not
installable. Wait for App Store Connect processing, add the build to **Internal
Testing**, and verify its testing status. This group uses manual build selection.

## First upload validation

Version `0.1.0 (1)` was uploaded successfully on October 6, 2026 from source
commit `3877de7`. TypeScript checks, all 22 application/service tests, the device
Release archive, and the simulator Release build passed. The exported package
passed strict code-signature verification and contains its JavaScript bundle.
It targets iPhone and iPad on iOS 16.4 or later.

Apple processing completed, the build was assigned to **Internal Testing**, and
the account owner is listed as **Invited**. Open the invitation on an iPhone or
iPad with TestFlight installed, accept it, and install DV Lottery Tracker.
The group's current state is available in
[App Store Connect](https://appstoreconnect.apple.com/teams/4f1ebaf8-46d2-4f64-bc34-1ff7641b9d2b/apps/6819749953/testflight/groups/f473f0f7-a59c-45f4-8f1a-6e75421ba074).

Apple accepted the upload with non-blocking missing-dSYM warnings for the
precompiled ExpoImageManipulator, React, ReactNativeDependencies, SDWebImage,
and Hermes frameworks. Crash traces inside those dependencies may have limited
symbolication; the app's own dSYM is present in the archive. Preserve the archive
and upload logs when investigating beta crashes.

## Gold DV logo refresh — build 2

Version `0.1.0 (2)` was uploaded successfully on October 6, 2026 from source
commit `dd0d594`. It replaces the eagle logo with the user-approved gold DV
medallion and flag across the home-screen icon, native splash, loading state,
app header, welcome tour, and About screen. Matching assets are also updated in
the separate SwiftUI prototype.

Apple processing completed and build 2 is assigned to the existing **Internal
Testing** group. Install or update to `0.1.0 (2)` in TestFlight to review the logo.

TypeScript checking and both Release builds passed. The existing welcome-tour
check passed on iPhone 15 and iPad Air with no failures or skips, and captured
screenshots were reviewed. The same non-blocking dependency dSYM warnings from
the first upload remain. No application logic or data schema was changed.

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
