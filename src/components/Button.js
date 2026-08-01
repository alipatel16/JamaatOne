import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text
} from "react-native";
import { colors, radius, spacing, typography } from "../theme";

const variants = {
  primary: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
    textColor: "#FFFFFF"
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
    textColor: colors.primaryStrong
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    textColor: colors.text
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
    textColor: colors.danger
  }
};

export default function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  compact = false,
  style
}) {
  const palette = variants[variant] || variants.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor
        },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} />
      ) : (
        <Text style={[styles.text, { color: palette.textColor }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center"
  },
  compact: {
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  text: {
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }]
  },
  disabled: {
    opacity: 0.5
  }
});
