/** Shared visual language for the preparation, photo and tracking experiences. */
export const colors = {
  navy: "#142C4C",
  blue: "#245EDE",
  cobalt: "#245EDE",
  blueSoft: "#EDF3FF",
  red: "#B52F3D",
  dangerSoft: "#FFF1F2",
  bg: "#F5F7FB",
  muted: "#5B6B80",
  line: "#E1E7F0",
  inputLine: "#CBD5E3",
  white: "#FFFFFF",
  green: "#216A55",
  successBg: "#EAF6EF",
  warm: "#FFF5E3",
  amber: "#805611",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};
export const radius = { sm: 8, input: 14, button: 16, card: 24, pill: 100 };
export const typography = {
  page: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700" as const,
    letterSpacing: -0.9,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.45,
  },
  body: { fontSize: 16, lineHeight: 24 },
  detail: { fontSize: 13, lineHeight: 19 },
  label: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    fontWeight: "700" as const,
  },
  field: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
};
export const motion = { short: 170, standard: 220 };
export const theme = { colors, spacing, radius, typography, motion };
