# Approved app artwork

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
the Expo assets and matching SwiftUI `AppIcon`/`BrandIcon` asset copies. Preserve
the eagle, five stars, open ring, stripe arrangement and proportions. Do not add
an outer margin, shadow or rounded corners to the app-icon master; iOS supplies
the icon mask. The exporter rounds only the in-app/launch mark.

The generated Expo `ios/` directory has a separate native AppIcon and splash
image set. Regenerate it through the existing Expo prebuild workflow after
exporting the assets; the Swift exporter does not update generated `ios/` files.

The shared Expo `BrandMark` supplies the app header, loading state, welcome tour,
and About screen. `expo-splash-screen` uses the same mark. SwiftUI uses `BrandIcon`
in its header, About screen, privacy cover, and launch storyboard.

## Future artwork updates

Keep the shared asset paths stable: replace `icon-source.png` with an approved full-bleed,
1024 × 1024 opaque sRGB PNG, then run `swift scripts/generate_icon.swift`.
Regenerate the Expo iOS assets before the next native build. This keeps the
AppIcon, header, onboarding and loading artwork consistent. Keep the independent-app
disclaimer and do not represent the artwork as an official government seal.
