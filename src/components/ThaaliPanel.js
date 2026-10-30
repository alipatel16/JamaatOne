import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, ScrollView, View, useWindowDimensions } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { fmbApi } from "../api/fmbApi";
import { mumineenApi } from "../api/mumineenApi";
import { startThaaliPayload, bulkStartPayload, failedBulkMembers, stopThaaliPayload, updateThaaliPayload, dayValue } from "../utils/fmbWorkflows";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import DatePickerField, { localDateValue } from "./DatePickerField";
import RemotePagedSelect from "./RemotePagedSelect";
import { FmbSheet, Notice, ui } from "./fmb/FmbUi";

const muminPage = async (page, search) => {
  const result = await mumineenApi.getPaged(page, 20, search);
  return { ...result, items: (result?.items || []).filter(item => item.isActive !== false) };
};

export default function ThaaliPanel({ canEdit = false }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [revision, setRevision] = useState(0);
  const [mode, setMode] = useState(null);
  const [selected, setSelected] = useState([]);
  const [startDate, setStartDate] = useState(localDateValue());
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [submittedMembers, setSubmittedMembers] = useState([]);
  const [operation, setOperation] = useState(null);
  const [operationForm, setOperationForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [operationError, setOperationError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setListError("");
    fmbApi.getThaali({ pageNumber: page, pageSize: 20, search: query }).then(result => {
      if (active) { setItems(Array.isArray(result?.items) ? result.items : []); setPages(Math.max(1, Number(result?.totalPages || 1))); setTotal(Number(result?.totalCount || 0)); }
    }).catch(error => { if (active) { setItems([]); setListError(error.message || "Unable to load Thali members."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, revision]);

  function open(value) {
    setMode(value); setSelected([]); setStartDate(localDateValue()); setFormError(""); setOutcome(null); setSubmittedMembers([]);
  }
  function refresh() { setPage(1); setRevision(value => value + 1); }
  function openOperation(kind, item) {
    if (!canEdit) return;
    setOperation({ kind, item }); setOperationError("");
    setOperationForm({ startDate: dayValue(item.startDate), endDate: kind === "STOP" ? localDateValue() : dayValue(item.endDate), reason: "" });
  }
  async function saveOperation() {
    if (inFlight.current || !canEdit) return;
    let body;
    try {
      if (operation.kind === "STOP") body = stopThaaliPayload(operationForm);
      if (operation.kind === "EDIT") body = updateThaaliPayload(operationForm);
    } catch (error) { setOperationError(error.message); return; }
    inFlight.current = true; setSaving(true); setOperationError("");
    try {
      const id = operation.item.thaaliPeriodId;
      if (operation.kind === "STOP") await fmbApi.stopThaali(id, body);
      else if (operation.kind === "EDIT") await fmbApi.updateThaali(id, body);
      else await fmbApi.deleteThaali(id);
      setSuccess(operation.kind === "DELETE" ? "Mistaken Thali entry deleted." : operation.kind === "STOP" ? "Thali stopped successfully." : "Thali dates updated.");
      setOperation(null); refresh();
    } catch (error) { setOperationError(error.message || "Unable to save this change."); }
    finally { inFlight.current = false; setSaving(false); }
  }

  async function save() {
    if (inFlight.current) return;
    let payload;
    try { payload = mode === "BULK" ? bulkStartPayload(selected, startDate) : startThaaliPayload(selected[0]?.muminId, startDate); }
    catch (error) { setFormError(error.message); return; }
    inFlight.current = true; setSaving(true); setFormError(""); setSuccess(""); setOutcome(null);
    try {
      if (mode === "BULK") {
        const snapshot = [...selected];
        const result = await fmbApi.bulkStartThaali(payload);
        setOutcome(result); setSubmittedMembers(snapshot);
        const remaining = failedBulkMembers(snapshot, result);
        setSelected(remaining);
        setSuccess(`${Number(result?.successCount || 0)} of ${Number(result?.totalRequested || snapshot.length)} Thali entries added.`);
        if (!remaining.length) setMode(null);
      } else {
        await fmbApi.startThaali(payload);
        setSuccess("Thali entry added successfully."); setMode(null); setSelected([]);
      }
      refresh();
    } catch (error) { setFormError(error.message || "Unable to add Thali members."); }
    finally { inFlight.current = false; setSaving(false); }
  }

  const summaryOnly = outcome && !Array.isArray(outcome.results) && Number(outcome.failedCount || 0) > 0;
  return <View>
    <View style={styles.hero}>
      <View style={styles.heroIcon}><MaterialCommunityIcons name="silverware-fork-knife" size={25} color={colors.primaryStrong} /></View>
      <View style={styles.flex}><Text style={styles.eyebrow}>FMB • THALI</Text><Text style={styles.title}>Thali members</Text><Text style={styles.meta}>Manage the Mumineen receiving Thali.</Text></View>
      <View style={styles.count}><Text style={styles.countValue}>{total}</Text><Text style={styles.meta}>members</Text></View>
    </View>
    <View style={styles.primaryActions}><Button title="Add member" onPress={() => open("SINGLE")} style={styles.grow} /><Button title="Add in bulk" variant="outline" onPress={() => open("BULK")} style={styles.grow} /></View>
    {success ? <Text accessibilityRole="alert" style={styles.success}>{success}</Text> : null}
    <Card>
      <Input label="Find a Thali member" value={search} onChangeText={setSearch} placeholder="Name or ITS number" returnKeyType="search" onSubmitEditing={() => { setQuery(search.trim()); setPage(1); }} />
      <View style={styles.actions}><Button title="Search" compact onPress={() => { setQuery(search.trim()); setPage(1); }} /><Button title="Refresh" compact variant="outline" onPress={refresh} /></View>
    </Card>
    {listError ? <Card><Text style={styles.error}>{listError}</Text><Button title="Retry" compact variant="outline" onPress={refresh} /></Card> : null}
    {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : items.map(item => <Card key={String(item.thaaliPeriodId)}>
      <View style={[styles.memberRow, { flexWrap: "wrap" }]}>
        <View style={styles.avatar}><Text style={styles.initial}>{String(item.fullName || "M").slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.flex}><Text style={styles.name}>{item.fullName || "Unnamed Mumin"}</Text><Text selectable style={styles.meta}>ITS {item.itsId || "—"}</Text>{item.mobile ? <Text selectable style={styles.meta}>{item.mobile}</Text> : null}</View>
        {canEdit ? <View style={[ui.actions, phone && { width: "100%", marginTop: spacing.sm }]}><Button title="Edit dates" compact variant="outline" onPress={() => openOperation("EDIT", item)} /><Button title="Stop" compact variant="outline" onPress={() => openOperation("STOP", item)} /><Button title="Delete" compact variant="ghost" onPress={() => openOperation("DELETE", item)} /></View> : null}
      </View>
    </Card>)}
    {!loading && !listError && !items.length ? <Card><Text style={styles.name}>No Thali members found</Text><Text style={styles.meta}>Try another search or add a member to start.</Text></Card> : null}
    <View style={styles.pagination}><Button title="Previous" compact variant="outline" disabled={loading || page <= 1} onPress={() => setPage(value => value - 1)} /><Text style={styles.meta}>Page {page} of {pages}</Text><Button title="Next" compact variant="outline" disabled={loading || page >= pages} onPress={() => setPage(value => value + 1)} /></View>
    <FmbSheet visible={Boolean(operation)} title={operation?.kind === "STOP" ? "Stop Thali" : operation?.kind === "EDIT" ? "Correct Thali dates" : "Delete mistaken entry"} subtitle={operation?.item.fullName} saving={saving} onClose={() => setOperation(null)} action={{ title: operation?.kind === "DELETE" ? "Delete entry" : "Save changes", variant: operation?.kind === "DELETE" ? "danger" : "primary", onPress: saveOperation }}>
      {operation?.kind === "DELETE" ? <Notice error>Delete this Thali registration only if it was added by mistake. This action cannot be undone. To end an existing service, use Stop instead.</Notice> : <View>
        {operation?.kind === "EDIT" ? <View><Text style={[ui.meta, { marginBottom: spacing.md }]}>Enter the corrected start date. Leave the end date empty for an ongoing Thali.</Text><DatePickerField label="Corrected start date" required value={operationForm.startDate} onChange={startDate => setOperationForm(f => ({ ...f, startDate }))} /></View> : <Text style={[ui.meta, { marginBottom: spacing.md }]}>The end date is the last day this member takes Thali.</Text>}
        <DatePickerField label={operation?.kind === "STOP" ? "Last serving date" : "End date (optional)"} required={operation?.kind === "STOP"} value={operationForm.endDate} onChange={endDate => setOperationForm(f => ({ ...f, endDate }))} />
        {operation?.kind === "EDIT" && operationForm.endDate ? <Button title="Keep ongoing / clear end date" variant="ghost" compact onPress={() => setOperationForm(f => ({ ...f, endDate: "" }))} /> : null}
        <Input label={operation?.kind === "STOP" || operationForm.endDate ? "Reason *" : "Reason (used when end date is set)"} placeholder="Why are you changing this Thali?" value={operationForm.reason} onChangeText={reason => setOperationForm(f => ({ ...f, reason }))} maxLength={500} multiline />
      </View>}
      <Notice error>{operationError}</Notice>
    </FmbSheet>
    <Modal visible={Boolean(mode)} transparent animationType="slide" onRequestClose={() => !saving && setMode(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.backdrop, phone && styles.backdropPhone]}>
        <View style={[styles.sheet, phone && styles.sheetPhone]}>
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{mode === "BULK" ? "Add Thali members" : "Add Thali member"}</Text><Button title="Close" compact variant="ghost" disabled={saving} onPress={() => setMode(null)} /></View>
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.description}>{mode === "BULK" ? "Select up to 500 Mumineen. The start date applies to every selected member." : "Choose a Mumin and the date they started taking Thali."}</Text>
            <RemotePagedSelect key={mode} label={mode === "BULK" ? "Mumineen" : "Mumin"} fetchPage={muminPage} keyField="muminId" selected={selected} multiple={mode === "BULK"} onChange={value => { setSelected(value); setFormError(""); }} disabled={saving} />
            {mode === "BULK" && selected.length ? <View style={styles.selectionSummary}>
              <Text style={styles.name}>{selected.length} members selected</Text>
              {selected.slice(0, 8).map(item => <View key={String(item.muminId)} style={styles.selectionRow}><Text style={styles.selectionName}>{item.fullName || item.firstName || `Mumin ${item.muminId}`} · {item.itsId}</Text><Button title="Remove" compact variant="ghost" disabled={saving} onPress={() => setSelected(current => current.filter(value => value.muminId !== item.muminId))} /></View>)}
              {selected.length > 8 ? <Text style={styles.meta}>And {selected.length - 8} more members.</Text> : null}
              <Button title="Clear selection" compact variant="outline" disabled={saving} onPress={() => setSelected([])} />
            </View> : null}
            <DatePickerField label="Start date" value={startDate} required onChange={value => { if (!saving) setStartDate(value); }} />
            {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
            {outcome ? <View style={styles.outcome}>
              <Text style={styles.name}>{outcome.successCount || 0} succeeded · {outcome.failedCount || 0} failed</Text>
              {(outcome.results || []).filter(item => item.success !== true).map(item => <Text key={String(item.muminId)} style={styles.error}>{submittedMembers.find(member => Number(member.muminId) === Number(item.muminId))?.fullName || `Mumin ${item.muminId}`}: {item.errorCode || "Could not add Thali"}</Text>)}
              <Text style={styles.meta}>{summaryOnly ? "No member-level results were returned. Check the refreshed list before submitting another selection." : "Successful entries have been removed from the selection. Review the remaining members before retrying."}</Text>
            </View> : null}
            <Button title={mode === "BULK" ? `Add ${selected.length} members` : "Add Thali member"} loading={saving} disabled={!selected.length || Boolean(summaryOnly)} onPress={save} />
            <Button title="Cancel" variant="ghost" disabled={saving} onPress={() => setMode(null)} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, grow: { flex: 1, minWidth: 130 },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceTint, borderWidth: 1, borderColor: colors.primarySoftStrong, marginBottom: spacing.md },
  heroIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: 3 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 19 }, count: { alignItems: "center" }, countValue: { color: colors.primaryStrong, fontSize: 24, fontWeight: "900" },
  primaryActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }, actions: { flexDirection: "row", gap: spacing.xs },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, avatar: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, initial: { color: colors.primaryStrong, fontWeight: "900", fontSize: 18 },
  name: { color: colors.text, fontSize: 14, fontWeight: "800" }, loader: { marginVertical: spacing.lg }, pagination: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, marginTop: spacing.sm },
  success: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.successSoft, color: colors.success, marginBottom: spacing.md, lineHeight: 20 }, error: { color: colors.danger, lineHeight: 20, marginBottom: spacing.sm },
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.md, backgroundColor: colors.overlay }, backdropPhone: { padding: 0, justifyContent: "flex-end" }, sheet: { width: "100%", maxWidth: 620, maxHeight: "94%", borderRadius: radius.xl, backgroundColor: colors.surface, overflow: "hidden" }, sheetPhone: { height: "100%", maxHeight: "100%", borderRadius: 0 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, sheetTitle: { flex: 1, color: colors.text, fontSize: 21, fontWeight: "900" }, sheetContent: { padding: spacing.md, paddingBottom: spacing.xl }, description: { color: colors.muted, lineHeight: 20, marginBottom: spacing.lg },
  selectionSummary: { backgroundColor: colors.surfaceMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.md, gap: spacing.xs }, selectionRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs }, selectionName: { color: colors.textSoft, flex: 1, fontSize: 12 }, outcome: { padding: spacing.md, backgroundColor: colors.accentSoft, borderRadius: radius.md, marginBottom: spacing.md, gap: spacing.xs }
});
