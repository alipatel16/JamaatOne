import { Platform } from "react-native";

export const colors = {
  primary: "#526A61",
  primaryStrong: "#344B43",
  primarySoft: "#EAF0ED",
  accent: "#B89558",
  accentSoft: "#F7F0E5",
  background: "#F7F8F6",
  backgroundAlt: "#F1F4F1",
  surface: "#FFFFFF",
  surfaceMuted: "#FAFBFA",
  text: "#25312D",
  textSoft: "#4D5A55",
  muted: "#7A8580",
  border: "#E3E8E5",
  borderStrong: "#D2DAD6",
  danger: "#B85D57",
  dangerSoft: "#FBEDEC",
  success: "#5F846D",
  successSoft: "#EAF4ED",
  warning: "#A77A34",
  warningSoft: "#FBF3E5",
  info: "#5D7187",
  infoSoft: "#ECF1F5",
  shadow: "#1F2E29"
};

export const spacing = {
  xxs: 4,
  xs: 7,
  sm: 11,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999
};

export const typography = {
  family: Platform.OS === "web"
    ? '"Mozilla Text", Inter, system-ui, sans-serif'
    : undefined,
  display: 34,
  title: 27,
  section: 20,
  body: 15,
  caption: 12
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: "0 12px 35px rgba(31, 46, 41, 0.06)"
    },
    default: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 3
    }
  })
};
