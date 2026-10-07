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
- Consumer UI, form experience and eagle logo: version `0.1.0`, build `3`
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

## Consumer UI, form experience and eagle logo — build 3

Version `0.1.0 (3)` contains the Home next-action dashboard, shared premium visual
system, grouped forms with first-error scroll/focus, native iOS input hints and
keyboard navigation, compact passport review and country normalization, and
refined photo/entry review screens. Storage keys, record schemas, production
services, app identifier, and signing configuration remain unchanged.

The approved eagle artwork replaces the gold medallion across the native icon,
splash, loading state, header, welcome tour and About screen. The user's mockup
was edited to remove its surrounding charcoal margin and shadow; the app-icon
master is a full-bleed, opaque 1024px sRGB PNG. The in-app mark has transparent
rounded corners. The separate SwiftUI prototype shares the exported artwork.

The production archive and standalone simulator Release build passed, along
with TypeScript, 38 application/service tests, native passport/education,
contact/keyboard/resume, photo, entry/timeline and responsive screen checks.
The UI runtime was implemented in `11b74c3`; the final eagle artwork and asset
documentation are in `25f8ae7`. The new device archive and simulator Release
build passed, and the archive includes the exact current in-app mark bytes.
TypeScript and the welcome-tour/responsive-screen checks passed again after
the artwork replacement: two test targets on each of iPhone 15 and iPad Air,
four executions with no failures or skips (`build/Eagle-Branding.xcresult`).

The October 6 export attempt with the new eagle archive was blocked before upload by Xcode reporting
`No Account for Team "ZDK3K9BT5S"` and no matching local distribution certificate.
App Store Connect is signed in in the browser and lists builds 1 and 2, but
Xcode's separate account UI still shows the same account-access error.
Restore the existing Apple account session, then retry the established automatic
export workflow; do not replace signing infrastructure or create a new app.
Build 3 is **not yet uploaded or assigned to Internal Testing**.

The verified archive is retained at
`~/Library/Developer/DVLotteryTracker/TestFlight-0.1.0-3-eagle/DVLotteryTracker-unsigned.xcarchive`,
alongside `UploadOptions.plist` and `upload.log`.
Use this eagle archive, not the earlier unuploaded build-3 archive with gold artwork.

For simulator checks, build the Release app with simulator signing enabled
(`CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-`). Installing an unsigned
simulator build can make iOS Keychain access fail with a missing-entitlement
error. This is separate from the unsigned **device archive** used for the
existing App Store export workflow; export supplies its distribution signature.

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

## Round-2 polish device checklist

**NOT BUILT LOCALLY.** This branch has not been run in Expo, built for iOS, or
uploaded to TestFlight. Existing archive and simulator results above are for
earlier revisions. Rebuild the PR version through the existing workflow; no app
identity, signing or deployment settings were changed by this pass.

- Complete personal information except education, then Continue. Education must
  be brought into view, outlined and accompanied by its inline message. Correct
  it and continue. Repeat with several missing fields, both no-name switches,
  conditional family members, contact/postal fields and Review confirmations.
- Repeat first-invalid navigation in passport editing, photo capture-date
  confirmation, submitted-entry saving, timeline updates and email consent.
  With VoiceOver, the field and error should be understandable without color.
- Check iOS AutoFill for first/middle/family name, email, phone, address lines,
  city, state and postal code. Open mailing/residence country search to check
  stored-contact suggestions; selecting a matching country is still required.
  Birthplace and passport countries must not inherit a residence-country hint.
- Check Next/Done and numeric-keyboard toolbars, multiline Notes dismissal,
  active-field visibility, keyboard suggestion/frame changes and sticky Continue.
  Confirm that inline errors remain above the keyboard and action area.
- Scan via camera and Photos, cancel and deny permissions, retry, edit OCR
  fields and confirm replacement. Confirm unresolved countries remain unchanged
  only after explicit consent, and that birthplace/contact/family data remain
  intact. Native OCR still requires a build with the existing local module.
- Choose each family member before taking a photo. Verify the assigned person
  after capture/retake, thumbnails and matching statuses in preparation and the
  library. Review flags and six-month recency, not automated approval, determine
  status. Existing photos, entry confirmations and timelines must remain intact.
- Inspect Home hierarchy, secondary headers, expanded Settings rows, external
  website labels, readable disabled buttons, press/progress animations and
  existing completion haptics. Check Reduce Motion and larger accessibility text.
- Inspect smaller and larger iPhones, iPad, portrait/landscape, notch/Dynamic
  Island, bottom home indicator, safe areas, tab bar and sheet presentation.
- Confirm customer builds contain no development overlay. The app's Settings
  gear must remain usable. Confirm local-save errors provide a visible retry
  action on every tab, and verify draft/entry/photo persistence after relaunch.

AutoFill suggestions, haptics, permissions, native measurements and responsive
layout cannot be established by the static checks. The temporary icon is
unchanged; the final independent artwork is still pending.

## Publication scope

Uploading a build to TestFlight does not publish an App Store release. Begin with
internal testing for the account owner; external invitations or a public beta
link require a separate distribution decision.
