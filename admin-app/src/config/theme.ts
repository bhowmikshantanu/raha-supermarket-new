// Central design tokens — colors, spacing, radii, typography.
// Change palette here to re-skin the entire app.

export const COLORS = {
  // Raha warm premium palette
  primary: "#7A1F3D",
  primaryDark: "#5A1630",
  primaryLight: "#FCE7EE",
  primarySoft: "#FFF4F7",

  maroon: "#7A1F3D",
  maroonDark: "#5A1630",

  saffron: "#F28C28",
  saffronDark: "#D96B0B",
  saffronLight: "#FFF0DD",

  indigo: "#4B3F8F",
  indigoDark: "#33296D",
  indigoLight: "#EEEAFB",

  cream: "#FFF9F2",
  creamStrong: "#FFF2E2",

  background: "#FFFCF8",
  surface: "#FFF8F1",
  surfaceAlt: "#FDF1EA",
  border: "#EADDD5",
  borderLight: "#F3E9E3",

  textPrimary: "#33233A",
  textSecondary: "#6F6373",
  textMuted: "#9B909D",
  textOnPrimary: "#FFFFFF",

  warning: "#F28C28",
  warningLight: "#FFF0DD",
  danger: "#C2414B",
  dangerLight: "#FCE8EA",

  // Open/available status should remain green
  success: "#16A34A",

  info: "#4B3F8F",
  infoLight: "#EEEAFB",

  shadow: "rgba(74, 39, 58, 0.10)",
  overlay: "rgba(28, 18, 25, 0.52)",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const FONT = {
  size: {
    xs: 11,
    sm: 12,
    md: 14,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },
};

export const SHADOW = {
  card: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  fab: {
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};
