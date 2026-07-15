import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing } from "../theme";

export default function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === "danger" ? styles.danger : styles.primary,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  text: { color: "#fff", fontWeight: "700" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});
