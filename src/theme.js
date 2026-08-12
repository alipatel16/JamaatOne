import { Platform } from "react-native";

export const colors = {
  primary: "#247C70",
  primaryStrong: "#145A52",
  primaryDark: "#103F3B",
  primarySoft: "#E8F5F2",
  primarySoftStrong: "#D7EFEA",
  accent: "#C89B46",
  accentStrong: "#9E742B",
  accentSoft: "#FBF4E7",
  background: "#F5F7F9",
  backgroundAlt: "#EEF2F4",
  surface: "#FFFFFF",
  surfaceMuted: "#F9FBFC",
  surfaceTint: "#F2F8F7",
  text: "#172321",
  textSoft: "#465653",
  muted: "#778481",
  border: "#E4EAE8",
  borderStrong: "#D2DCDA",
  danger: "#C45151",
  dangerSoft: "#FCEEEE",
  success: "#357A59",
  successSoft: "#EAF5EF",
  warning: "#A36E25",
  warningSoft: "#FFF4E2",
  info: "#4E6F91",
  infoSoft: "#EDF4FA",
  shadow: "#102D29",
  overlay: "rgba(16, 35, 33, 0.42)"
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
  xxxl: 56
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  pill: 999
};

export const typography = {
  family: Platform.OS === "web"
    ? '"Mozilla Text", Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    : undefined,
  display: 38,
  title: 28,
  section: 20,
  body: 15,
  caption: 12
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: "0 12px 34px rgba(16, 45, 41, 0.065)"
    },
    default: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3
    }
  }),
  floating: Platform.select({
    web: {
      boxShadow: "0 20px 55px rgba(16, 45, 41, 0.14)"
    },
    default: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8
    }
  })
};
