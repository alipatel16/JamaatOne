import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { colors, spacing } from "../theme";

export default function Screen({
  children,
  scroll = true,
  style,
  contentStyle
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const content = (
    <View
      style={[
        styles.content,
        isWide && styles.contentWide,
        contentStyle,
        style
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    flexGrow: 1
  },
  content: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    flex: 1
  },
  contentWide: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl
  }
});
