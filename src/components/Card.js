import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { colors, radius, shadows, spacing } from "../theme";

export default function Card({ children, style, elevated = true, tint = false }) {
  const { width } = useWindowDimensions();
  const isPhone = width < 600;

  return (
    <View
      style={[
        styles.card,
        isPhone && styles.cardPhone,
        tint && styles.tint,
        elevated && shadows.card,
        style
      ]}
    >
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
  },
  cardPhone: {
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  tint: {
    backgroundColor: colors.surfaceTint,
    borderColor: colors.primarySoftStrong
  }
});
