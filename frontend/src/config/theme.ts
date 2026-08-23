// Central design tokens — Raha Supermarket premium palette.
// Deep Maroon + Saffron Orange + Indigo + Warm Cream.

export const COLORS = {
  // Main Raha branding
  primary: "#8B0A3C",
  primaryDark: "#65062C",
  primaryLight: "#FCE8EF",
  primarySoft: "#FFF5F7",

  // Secondary / premium accent
  secondary: "#3434A8",
  secondaryDark: "#242475",
  secondaryLight: "#EEEEFF",

  // Offers / highlights
  accent: "#FF7A00",
  accentDark: "#D95F00",
  accentLight: "#FFF0DF",

  // Backgrounds
  background: "#FFFCF8",
  surface: "#FFFFFF",
  surfaceAlt: "#FFF7F1",

  border: "#E9E2DC",
  borderLight: "#F4ECE6",

  // Text
  textPrimary: "#17172C",
  textSecondary: "#626276",
  textMuted: "#9898A7",
  textOnPrimary: "#FFFFFF",

  // Functional colors
  warning: "#FF7A00",
  warningLight: "#FFF0D8",

  danger: "#D9363E",
  dangerLight: "#FDE8E9",

  success: "#159947",
  info: "#3434A8",
  infoLight: "#EEEEFF",

  shadow: "rgba(49, 24, 40, 0.10)",
  overlay: "rgba(18, 10, 20, 0.52)",
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
    shadowColor: "#4A2032",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },

  header: {
    shadowColor: "#4A2032",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },

  fab: {
    shadowColor: "#8B0A3C",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
};