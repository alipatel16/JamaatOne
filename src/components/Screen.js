import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { colors, spacing } from "../theme";

export default function Screen({ children, scroll = true, style, contentStyle }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const isCompact = width < 600;
  const isNarrow = width < 380;

  const content = (
    <View style={[styles.content, isWide && styles.contentWide, isCompact && styles.contentCompact, isNarrow && styles.contentNarrow, contentStyle, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.topGlow} />
      <View pointerEvents="none" style={styles.sideGlow} />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  topGlow: { position: "absolute", top: -160, right: -100, width: 420, height: 420, borderRadius: 210, backgroundColor: "rgba(36, 124, 112, 0.055)" },
  sideGlow: { position: "absolute", top: 180, left: -150, width: 310, height: 310, borderRadius: 155, backgroundColor: "rgba(200, 155, 70, 0.045)" },
  scroll: { flexGrow: 1 },
  content: { width: "100%", maxWidth: 1220, alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 112, flex: 1 },
  contentWide: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  contentCompact: { paddingHorizontal: spacing.sm, paddingTop: 14, paddingBottom: 104 },
  contentNarrow: { paddingHorizontal: 10 }
});
