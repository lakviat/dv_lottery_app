# Current artwork and replacement points

The existing icon is temporary for the round-2 polish. The owner will supply a
new independent consumer-app icon later. This pass retains the existing files
without redesigning them; the provenance below describes the previous artwork.

The master uses the user's approved white eagle, five stars and open circular
ring over navy and red-and-white stripes. It replaces the gold DV medallion.
With the user's authorization, the built-in image editing tool removed the
charcoal mockup margin and outer shadow, then extended the artwork to a full-bleed
square without baked outer rounded corners. The exact editing prompt is saved
in `EDIT_PROMPT.txt`. The resulting master is an opaque 1024 × 1024 PNG with an
embedded sRGB profile.

- `icon-source.png`: 1024 × 1024 opaque PNG master, tagged sRGB.
- `icon.png`: 1024 × 1024 opaque sRGB app icon; iOS applies the outer mask.
- `mark.png`: 512 × 512 sRGB in-app/launch mark with transparent rounded corners.

Run `swift scripts/generate_icon.swift` from the repository root to regenerate
the Expo assets and matching SwiftUI `AppIcon`/`BrandIcon` asset copies. Do not add
an outer margin, shadow or rounded corners to the app-icon master; iOS supplies
the icon mask. The exporter rounds only the in-app/launch mark.

The generated Expo `ios/` directory has a separate native AppIcon and splash
image set. Regenerate it through the existing Expo prebuild workflow after
exporting the assets; the Swift exporter does not update generated `ios/` files.

The shared Expo `BrandMark` supplies the app header, loading state, welcome tour,
and About screen. `expo-splash-screen` uses the same mark. SwiftUI uses `BrandIcon`
in its header, About screen, privacy cover, and launch storyboard.

## Future artwork updates

| Surface | Source of truth |
| --- | --- |
| Expo installed AppIcon | `app.json` → `assets/branding/icon.png` |
| Expo launch/splash mark | `app.json` splash plugin → `assets/branding/mark.png` |
| Home header, loading, About, welcome tour | `expo-app/Brand.tsx` → shared `BRAND_MARK` / `BrandMark` |
| Display name and About version | `expo-app/Brand.tsx` reads `app.json` |
| Separate SwiftUI AppIcon and in-app/launch/privacy artwork | `DVLottery/Assets.xcassets/{AppIcon.appiconset,BrandIcon.imageset}` |
| Asset export | `scripts/generate_icon.swift` reads `icon-source.png` |

Keep the shared asset paths stable: replace `icon-source.png` with an approved full-bleed,
1024 × 1024 opaque sRGB PNG, then run `swift scripts/generate_icon.swift`.
Regenerate the Expo iOS assets before the next native build. This keeps the
AppIcon, header, onboarding and loading artwork consistent. Keep the independent-app
disclaimer. The new artwork must avoid U.S. government seal/eagle styling that
could imply government ownership. Do not change the app identity, bundle IDs,
signing, credentials or storage keys when replacing artwork.
