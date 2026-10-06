# Approved app artwork

The master is the full-square gold DV medallion and dark American flag image
provided and approved by the user on October 6, 2026. It replaces the earlier
eagle design. The original artwork was imported directly, without redrawing or
AI regeneration. Its untagged RGB pixels were assigned the sRGB color profile.

- `icon-source.png`: 1024 × 1024 opaque PNG master, tagged sRGB.
- `icon.png`: 1024 × 1024 opaque sRGB app icon; iOS applies the outer mask.
- `mark.png`: 512 × 512 sRGB in-app/launch mark with transparent rounded corners.

Run `swift scripts/generate_icon.swift` from the repository root to regenerate
the Expo assets and matching SwiftUI `AppIcon`/`BrandIcon` asset copies. Preserve
the medallion, flag, proportions, and existing internal highlights and shadows.
No additional outer margin or shadow should be added.

The shared Expo `BrandMark` supplies the app header, loading state, welcome tour,
and About screen. `expo-splash-screen` uses the same mark. SwiftUI uses `BrandIcon`
in its header, About screen, privacy cover, and launch storyboard.

## Next artwork

The consumer UI overhaul uses the current image provisionally. A replacement icon
has been requested by the owner but has not yet been supplied. Keep the shared
asset paths stable: replace `icon-source.png` with the approved full-bleed,
1024 × 1024 opaque sRGB PNG, then run `swift scripts/generate_icon.swift`.
This updates the Expo/native AppIcon and the shared header, onboarding and loading
mark together. Keep the independent-app disclaimer; do not add a government seal.
