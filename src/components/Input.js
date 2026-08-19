import React from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

export default function Input({ label, error, helperText, style, ...props }) {
  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          error && styles.inputError
        ]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", maxWidth: "100%", marginBottom: spacing.md },
  label: {
    fontFamily: typography.family,
    marginBottom: spacing.xs,
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "800"
  },
  input: {
    width: "100%",
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {})
  },
  multiline: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  helper: { color: colors.muted, fontSize: 12, marginTop: spacing.xs, lineHeight: 17 }
});
