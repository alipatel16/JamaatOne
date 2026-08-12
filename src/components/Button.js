import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

const variants = {
  primary: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
    textColor: "#FFFFFF"
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoftStrong,
    textColor: colors.primaryStrong
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    textColor: colors.text
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    textColor: colors.primaryStrong
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#F3D6D6",
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
      accessibilityRole="button"
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
        <Text style={[styles.text, { color: palette.textColor }]}>{title}</Text>
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
    fontWeight: "800",
    letterSpacing: 0.1
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }]
  },
  disabled: {
    opacity: 0.5
  }
});
