import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, shadows, spacing } from "../theme";

export default function Card({ children, style, elevated = true }) {
  return (
    <View style={[styles.card, elevated && shadows.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md
  }
});
