import React, { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { timePickerDate, selectedTime } from "../utils/timePicker";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";

export default function TimePickerField({ label, value, onChange, disabled = false }) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(timePickerDate(value));
  return <View style={styles.wrapper}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value || "Select time"}`} disabled={disabled} style={[styles.field, disabled && { opacity: 0.5 }]} onPress={() => { setDraft(timePickerDate(value)); setVisible(true); }}><MaterialCommunityIcons name="clock-outline" size={21} color={colors.primaryStrong} /><Text style={[styles.value, !value && { color: colors.muted }]}>{value || "Select time"}</Text></Pressable>
    {visible && Platform.OS === "android" ? <DateTimePicker value={draft} mode="time" is24Hour display="default" onChange={(event, date) => { setVisible(false); if (event.type !== "dismissed" && date) onChange(selectedTime(date)); }} /> : null}
    {Platform.OS === "ios" ? <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}><View style={styles.backdrop}><View style={styles.sheet}><Text style={styles.title}>{label}</Text><DateTimePicker value={draft} mode="time" display="spinner" onChange={(_, date) => { if (date) setDraft(date); }} /><View style={styles.actions}><Button title="Cancel" variant="outline" onPress={() => setVisible(false)} /><Button title="Select time" onPress={() => { onChange(selectedTime(draft)); setVisible(false); }} /></View></View></View></Modal> : null}
  </View>;
}
const styles = StyleSheet.create({
  wrapper: { width: "100%", marginBottom: spacing.md }, label: { color: colors.textSoft, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.md }, value: { color: colors.text, fontSize: 16 },
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.md, backgroundColor: colors.overlay }, sheet: { width: "100%", maxWidth: 400, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface }, title: { color: colors.text, fontSize: 18, fontWeight: "800" }, actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm }
});
