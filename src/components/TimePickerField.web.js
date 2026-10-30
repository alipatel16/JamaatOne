import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

export default function TimePickerField({ label, value, onChange, disabled = false }) {
  return <View style={styles.wrapper}><Text style={styles.label}>{label}</Text>{React.createElement("input", {
    type: "time", "aria-label": label, value: value || "", disabled, step: 60,
    onClick: event => { try { event.currentTarget.showPicker?.(); } catch { /* Native picker may already be open. */ } },
    onChange: event => { if (/^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)) onChange(event.target.value); },
    style: { boxSizing: "border-box", width: "100%", minHeight: 52, border: `1px solid ${colors.borderStrong}`, borderRadius: radius.md, padding: `0 ${spacing.md}px`, font: "inherit", fontSize: 16, color: colors.text, background: colors.surface, cursor: "pointer", opacity: disabled ? 0.5 : 1 }
  })}</View>;
}
const styles = StyleSheet.create({ wrapper: { width: "100%", marginBottom: spacing.md }, label: { color: colors.textSoft, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs } });
