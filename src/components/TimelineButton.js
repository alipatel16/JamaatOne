import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View, ScrollView, useWindowDimensions } from "react-native";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import ActivityTimeline from "./ActivityTimeline";

export default function TimelineButton({ recordId, loadEntries, entityLabel, revision = 0 }) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setEntries(null); setError("");
    loadEntries(recordId).then(result => {
      if (active) setEntries((Array.isArray(result) ? result : []).slice().sort((a, b) => (Date.parse(a.performedAt) || 0) - (Date.parse(b.performedAt) || 0)));
    }).catch(e => { if (active) setError(e.message || "Unable to load timeline."); });
    return () => { active = false; };
  }, [open, recordId, loadEntries, revision, retry]);
  return <>
    <Button title="Timeline" compact variant="outline" onPress={() => setOpen(true)} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={[styles.backdrop, width < 600 && styles.backdropPhone]}><View style={[styles.sheet, width < 600 && styles.sheetPhone]}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.title}>{entityLabel} timeline</Text><Text style={styles.meta}>Who changed this record and when</Text></View><Button title="Close" compact variant="ghost" onPress={() => setOpen(false)} /></View>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>{error ? <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Retry timeline" variant="outline" onPress={() => setRetry(value => value + 1)} /></View> : !entries ? <ActivityIndicator color={colors.primary} /> : <ActivityTimeline entries={entries} entityLabel={entityLabel} getKey={(log, index) => String(log.announcementLogId || log.menuLogId || log.pauseLogId || log.windowLogId || index)} formatDateTime={value => value ? new Date(value).toLocaleString("en-IN") : "—"} />}</ScrollView>
    </View></View></Modal>
  </>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg, backgroundColor: colors.overlay }, backdropPhone: { padding: 0 },
  sheet: { width: "100%", maxWidth: 800, maxHeight: "90%", backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden" }, sheetPhone: { height: "100%", maxHeight: "100%", borderRadius: 0 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border }, title: { fontSize: 21, color: colors.text, fontWeight: "900" }, meta: { color: colors.muted, fontSize: 12, marginTop: 4 }, error: { color: colors.danger, marginBottom: spacing.md }
});
