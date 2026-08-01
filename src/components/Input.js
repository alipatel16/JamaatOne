import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
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
      {!error && helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md
  },
  label: {
    fontFamily: typography.family,
    marginBottom: spacing.xs,
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 15
  },
  multiline: {
    minHeight: 108,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  inputError: {
    borderColor: colors.danger
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs
  }
});
