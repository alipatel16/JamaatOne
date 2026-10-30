import React from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { fmbApi } from "../../api/fmbApi";
import { parseMenu } from "../../utils/fmbWorkflows";
import { colors, radius, spacing } from "../../theme";
import Button from "../Button";
import TimelineButton from "../TimelineButton";

export const MENU_FIELDS = [
  ["kharaas1", "Kharaas 1"], ["kharaas2", "Kharaas 2"], ["fatehaItem", "Fateha item"], ["salwatItem", "Salwat item"],
  ["mainCourse1", "Main course 1"], ["mainCourse2", "Main course 2"], ["mainCourse3", "Main course 3"], ["mainCourse4", "Main course 4"],
  ["fruits", "Fruits"], ["mithaas1", "Mithaas 1"], ["mithaas2", "Mithaas 2"], ["specialItem1", "Special item 1"], ["specialItem2", "Special item 2"], ["remarks", "Remarks"]
];
export const formatDay = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const formatTime = value => value ? new Date(value).toLocaleString("en-IN") : "—";
export const prettyLabel = value => String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

export function Notice({ error, children }) {
  if (!children) return null;
  return <Text accessibilityRole="alert" style={[ui.notice, error && ui.error]}>{children}</Text>;
}
export function Empty({ title, caption }) { return <View style={ui.empty}><Text style={ui.title}>{title}</Text>{caption ? <Text style={ui.meta}>{caption}</Text> : null}</View>; }
export function Pager({ page, pages, total, loading, onChange }) {
  return <View style={ui.pager}><Text style={ui.meta}>{total} records · Page {page} of {pages}</Text><View style={ui.actions}><Button title="Previous" compact variant="outline" disabled={loading || page <= 1} onPress={() => onChange(page - 1)} /><Button title="Next" compact variant="outline" disabled={loading || page >= pages} onPress={() => onChange(page + 1)} /></View></View>;
}
export function FmbSheet({ visible, title, subtitle, onClose, saving = false, action, children, wide = false }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !saving && onClose()}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[ui.backdrop, phone && ui.backdropPhone]}>
      <View style={[ui.sheet, wide && { maxWidth: 900 }, phone && ui.sheetPhone]}>
        <View style={ui.sheetHeader}><View style={ui.flex}><Text style={ui.sheetTitle}>{title}</Text>{subtitle ? <Text style={ui.meta}>{subtitle}</Text> : null}</View><Button title="Close" compact variant="ghost" disabled={saving} onPress={onClose} /></View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={ui.sheetBody} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {action ? <View style={ui.sheetFooter}><Button title="Cancel" variant="outline" disabled={saving} onPress={onClose} style={phone ? ui.flex : undefined} /><Button {...action} loading={saving} style={phone ? ui.flex : undefined} /></View> : null}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
function valueText(value) { return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value); }
export function MenuContent({ value, compact = false }) {
  let menu;
  try { menu = parseMenu(value); } catch { menu = value; }
  if (!menu || (typeof menu === "object" && !Object.keys(menu).length)) return <Text style={ui.meta}>No dishes added for this date yet.</Text>;
  if (typeof menu !== "object") return <Text style={ui.body}>{String(menu)}</Text>;
  const entries = Object.entries(menu).filter(([, v]) => v !== null && v !== undefined && v !== "");
  return <View style={[ui.menuGrid, compact && { gap: 8 }]}>{entries.map(([key, value]) => <View key={key} style={[ui.menuItem, compact && { flexBasis: "100%" }]}><Text style={ui.label}>{MENU_FIELDS.find(([name]) => name === key)?.[1] || prettyLabel(key)}</Text><Text style={ui.body}>{valueText(value)}</Text></View>)}</View>;
}
export function InlineHistory({ kind, id }) {
  return <View style={ui.history}><TimelineButton recordId={id} loadEntries={kind === "MENU" ? fmbApi.getMenuLog : fmbApi.getPauseLog} entityLabel={kind === "MENU" ? "Menu" : "Thali pause"} /></View>;
}

export const ui = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  heading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 21, fontWeight: "900", color: colors.text }, name: { fontSize: 15, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, lineHeight: 19, color: colors.muted }, body: { fontSize: 14, lineHeight: 21, color: colors.textSoft }, label: { fontSize: 11, lineHeight: 18, fontWeight: "800", color: colors.muted },
  notice: { backgroundColor: colors.primarySoft, color: colors.primaryStrong, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, lineHeight: 21 }, error: { color: colors.danger, backgroundColor: colors.dangerSoft },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" },
  filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: spacing.sm }, filter: { flex: 1, minWidth: 180 },
  empty: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.sm }, pager: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  backdrop: { flex: 1, backgroundColor: colors.overlay, padding: spacing.lg, alignItems: "center", justifyContent: "center" }, backdropPhone: { padding: 0 },
  sheet: { width: "100%", maxWidth: 720, maxHeight: "90%", borderRadius: radius.xl, backgroundColor: colors.surface, overflow: "hidden" }, sheetPhone: { height: "100%", maxHeight: "100%", borderRadius: 0 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border }, sheetTitle: { fontSize: 21, fontWeight: "900", color: colors.text },
  sheetBody: { padding: spacing.md }, sheetFooter: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, menuItem: { flexGrow: 1, flexBasis: "44%", minWidth: 120, paddingVertical: spacing.xs },
  history: { marginTop: spacing.sm, alignItems: "stretch" }, historyBody: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  log: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 4 }, logData: { color: colors.textSoft, fontSize: 12, lineHeight: 18, paddingTop: 4 },
  separator: { borderTopWidth: 1, borderColor: colors.border, marginVertical: spacing.md },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, stat: { flexGrow: 1, flexBasis: 180, minWidth: 140, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }, statValue: { color: colors.primaryStrong, fontWeight: "900", fontSize: 31, marginVertical: spacing.xs },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.primarySoft }, badgeText: { fontSize: 11, fontWeight: "800", color: colors.primaryStrong }
});
