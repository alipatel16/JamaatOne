import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { accountsApi } from "../api/accountsApi";
import { colors, radius, spacing } from "../theme";
import { validateTakhmeen } from "../utils/takhmeen";
import Button from "./Button";
import Card from "./Card";
import DatePickerField, { localDateValue, transactionDateToIso } from "./DatePickerField";
import Input from "./Input";
import RemoteMumineenSelect from "./RemoteMumineenSelect";
import Select from "./Select";

const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
const date = value => value ? String(value).slice(0, 10) : "—";
const emptyForm = categoryId => ({ muminId: "", categoryId: String(categoryId || ""), bankAccountId: "", niyatAmount: "", fromDate: localDateValue(), toDate: localDateValue(), remarks: "" });

export default function TakhmeenPanel({ categories = [] }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryId, setCategoryId] = useState(String(categories[0]?.categoryId || ""));
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState("");
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [payer, setPayer] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef(0);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!categories.some(item => String(item.categoryId) === categoryId)) return;
      setLoading(true);
      setError("");
      try {
        const result = await accountsApi.getTakhmeen({ pageNumber: page, pageSize: 20, categoryId, search: query });
        if (!active) return;
        setItems(Array.isArray(result?.items) ? result.items : []);
        setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
        setTotalCount(Number(result?.totalCount || 0));
      } catch (error) {
        if (active) { setItems([]); setError(error.message || "Unable to load takhmeen."); }
      } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [page, categoryId, query, revision, categories]);

  useEffect(() => {
    let active = true;
    accountsApi.getBankAccounts().then(result => {
      if (active) setBanks((Array.isArray(result) ? result : []).filter(item => item.isActive !== false));
    }).catch(error => {
      if (active) setBanksError(error.message || "Unable to load bank accounts.");
    }).finally(() => { if (active) setBanksLoading(false); });
    return () => { active = false; detailRequest.current += 1; };
  }, []);

  const eligibleBanks = useMemo(() => banks.filter(bank =>
    (bank.categories || []).some(item => String(item.categoryId) === String(form?.categoryId))
  ), [banks, form?.categoryId]);
  const categoryOptions = categories.map(item => ({ value: String(item.categoryId), label: item.categoryName }));
  const refresh = () => { setPage(1); setRevision(value => value + 1); };

  function create() {
    setEditing(null); setPayer(null); setFormError(""); setForm(emptyForm(categoryId));
  }

  async function openDetail(item) {
    const request = ++detailRequest.current;
    setDetail(item); setDetailLoading(true); setDetailError("");
    try {
      const result = await accountsApi.getTakhmeenById(item.takhmeenId);
      if (request === detailRequest.current) setDetail(result);
    } catch (error) {
      if (request === detailRequest.current) setDetailError(error.message || "Unable to load takhmeen details.");
    } finally { if (request === detailRequest.current) setDetailLoading(false); }
  }

  function edit() {
    setEditing(detail);
    setPayer({ muminId: detail.muminId, fullName: detail.muminName, itsId: detail.muminItsId });
    setForm({ muminId: String(detail.muminId), categoryId: String(detail.categoryId), bankAccountId: String(detail.bankAccountId), niyatAmount: String(detail.niyatAmount), fromDate: date(detail.fromDate), toDate: date(detail.toDate), remarks: detail.remarks || "" });
    setFormError(""); setDetail(null);
  }

  async function save() {
    if (saving) return;
    const validation = validateTakhmeen(form, categories, eligibleBanks, editing?.paidAmount || 0);
    if (validation) { setFormError(validation); return; }
    setSaving(true); setFormError("");
    try {
      const payload = { ...form, fromDate: transactionDateToIso(form.fromDate), toDate: transactionDateToIso(form.toDate) };
      if (editing) await accountsApi.updateTakhmeen(editing.takhmeenId, payload);
      else await accountsApi.createTakhmeen(payload);
      setForm(null); refresh();
    } catch (error) { setFormError(error.message || "Unable to save takhmeen."); }
    finally { setSaving(false); }
  }

  async function remove() {
    const item = detail;
    const confirmed = Platform.OS === "web"
      ? globalThis.confirm?.(`Delete takhmeen for ${item.muminName || "this member"}?`)
      : await new Promise(resolve => Alert.alert("Delete takhmeen?", "This will cancel the selected takhmeen.", [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Delete", style: "destructive", onPress: () => resolve(true) }
      ], { cancelable: false }));
    if (!confirmed) return;
    setDeleting(item.takhmeenId); setDetailError("");
    try {
      await accountsApi.deleteTakhmeen(item.takhmeenId);
      setDetail(null); refresh();
    } catch (error) { setDetailError(error.message || "Unable to delete takhmeen."); }
    finally { setDeleting(null); }
  }

  if (!categories.length) return null;
  const bankLocked = editing && (Number(editing.paidAmount) > 0 || editing.history?.length > 0);
  const closeDetail = () => { if (!deleting) { detailRequest.current += 1; setDetail(null); } };

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.flex}><Text style={styles.title}>FMB Takhmeen</Text><Text style={styles.meta}>Record niyat and track paid and remaining amounts.</Text></View>
        <Button title="Record takhmeen" compact onPress={create} />
      </View>
      <Card>
        <Select label="FMB category" value={categoryId} options={categoryOptions} onChange={value => { setCategoryId(value); setPage(1); }} />
        <Input label="Search" placeholder="Member name or ITS" value={search} onChangeText={setSearch} onSubmitEditing={() => { setQuery(search.trim()); setPage(1); }} />
        <View style={styles.actions}><Button title="Search" compact onPress={() => { setQuery(search.trim()); setPage(1); }} /><Button title="Refresh" compact variant="outline" onPress={refresh} /></View>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : <>
        <Text style={styles.meta}>{totalCount} takhmeen records</Text>
        {items.map(item => <Card key={String(item.takhmeenId)}>
          <View style={styles.header}><View style={styles.flex}><Text style={styles.name}>{item.muminName || `Mumin ${item.muminId}`}</Text><Text style={styles.meta}>ITS {item.muminItsId || "—"} · {item.status || "—"}</Text></View><Button title="Details" compact variant="outline" onPress={() => openDetail(item)} /></View>
          <Text style={styles.meta}>{item.categoryName} · {date(item.fromDate)} to {date(item.toDate)}</Text>
          <Text style={styles.meta}>{item.bankAccountName || "—"}</Text>
          <View style={styles.metrics}>{[["Niyat", item.niyatAmount], ["Paid", item.paidAmount], ["Remaining", item.remainingAmount]].map(([label, amount]) => <View key={label} style={styles.metric}><Text style={styles.meta}>{label}</Text><Text style={styles.amount}>{money(amount)}</Text></View>)}</View>
        </Card>)}
        {!items.length && !error ? <Card><Text style={styles.meta}>No takhmeen found for this category.</Text></Card> : null}
      </>}
      <View style={styles.pagination}><Button title="Previous" compact variant="outline" disabled={loading || page <= 1} onPress={() => setPage(value => value - 1)} /><Text style={styles.meta}>Page {page} of {totalPages}</Text><Button title="Next" compact variant="outline" disabled={loading || page >= totalPages} onPress={() => setPage(value => value + 1)} /></View>

      <Modal visible={Boolean(form)} transparent animationType="fade" onRequestClose={() => !saving && setForm(null)}>
        <View style={[styles.backdrop, phone && styles.backdropPhone]}><View style={[styles.sheet, phone && styles.sheetPhone]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Text style={styles.title}>{editing ? "Edit takhmeen" : "Record takhmeen"}</Text>
            {formError || banksError ? <Text style={styles.error}>{formError || banksError}</Text> : null}
            {form ? <>
              <RemoteMumineenSelect label="Mumin" value={form.muminId} initialItem={payer} disabled={Boolean(editing) || saving} onChange={(id, item) => { setPayer(item); setForm(current => ({ ...current, muminId: id })); }} />
              <Select label="FMB category" value={form.categoryId} options={categoryOptions} disabled={Boolean(editing) || saving} onChange={id => setForm(current => ({ ...current, categoryId: id, bankAccountId: "" }))} />
              <Select label="Bank account" value={form.bankAccountId} options={eligibleBanks.map(item => ({ value: String(item.bankAccountId), label: item.bankAccountName || item.bankName }))} disabled={Boolean(bankLocked) || banksLoading || saving} onChange={id => setForm(current => ({ ...current, bankAccountId: id }))} placeholder={banksLoading ? "Loading bank accounts…" : "Select a bank account"} />
              {bankLocked ? <Text style={styles.meta}>The bank account cannot change after payments are linked.</Text> : null}
              {!banksLoading && !eligibleBanks.length ? <Text style={styles.error}>No active bank account is tagged with this category.</Text> : null}
              <Input label="Niyat amount" value={form.niyatAmount} keyboardType="decimal-pad" editable={!saving} onChangeText={value => setForm(current => ({ ...current, niyatAmount: value }))} />
              <DatePickerField label="From date" value={form.fromDate} required onChange={value => setForm(current => ({ ...current, fromDate: value }))} />
              <DatePickerField label="To date" value={form.toDate} required onChange={value => setForm(current => ({ ...current, toDate: value }))} />
              <Input label="Remarks" value={form.remarks} multiline maxLength={500} editable={!saving} onChangeText={value => setForm(current => ({ ...current, remarks: value }))} />
            </> : null}
            <View style={styles.actions}><Button title="Cancel" variant="outline" disabled={saving} onPress={() => setForm(null)} /><Button title={editing ? "Update takhmeen" : "Save takhmeen"} loading={saving} disabled={banksLoading || Boolean(banksError) || !eligibleBanks.length} onPress={save} /></View>
          </ScrollView>
        </View></View>
      </Modal>

      <Modal visible={Boolean(detail)} transparent animationType="fade" onRequestClose={closeDetail}>
        <View style={[styles.backdrop, phone && styles.backdropPhone]}><View style={[styles.sheet, phone && styles.sheetPhone]}>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <View style={styles.header}><Text style={styles.title}>Takhmeen details</Text><Button title="Close" compact variant="outline" disabled={Boolean(deleting)} onPress={closeDetail} /></View>
            {detailLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {detailError ? <Text style={styles.error}>{detailError}</Text> : null}
            {detail ? <>
              <Text style={styles.name}>{detail.muminName || `Mumin ${detail.muminId}`}</Text><Text style={styles.meta}>ITS {detail.muminItsId || "—"} · {detail.status || "—"}</Text>
              <Text style={styles.meta}>{detail.categoryName} · {detail.bankAccountName}</Text><Text style={styles.meta}>{date(detail.fromDate)} to {date(detail.toDate)}</Text>
              <View style={styles.metrics}>{[["Niyat", detail.niyatAmount], ["Paid", detail.paidAmount], ["Remaining", detail.remainingAmount]].map(([label, amount]) => <View key={label} style={styles.metric}><Text style={styles.meta}>{label}</Text><Text style={styles.amount}>{money(amount)}</Text></View>)}</View>
              {detail.remarks ? <Text style={styles.meta}>{detail.remarks}</Text> : null}
              <Text style={styles.sectionTitle}>Payment history</Text>
              {(detail.history || []).map(item => <View key={String(item.takhmeenHistoryId)} style={styles.history}>
                <Text style={styles.name}>{item.receiptNo || `Payment #${item.paymentId}`} · {money(item.paidAmount)}</Text>
                <Text style={styles.meta}>{item.entryType} · {item.paymentMethodName} · {date(item.transactionDate)}</Text>
                <Text style={styles.meta}>Remaining: {money(item.beforeRemainingAmount)} → {money(item.currentRemainingAmount)}</Text>
                {item.remarks ? <Text style={styles.meta}>{item.remarks}</Text> : null}
              </View>)}
              {!detailLoading && !detailError && !detail.history?.length ? <Text style={styles.meta}>No payments linked yet.</Text> : null}
              {detailError && !detailLoading ? <Button title="Retry details" compact variant="outline" onPress={() => openDetail(detail)} /> : null}
              {!detailLoading && !detailError && String(detail.status).toUpperCase() !== "CANCELLED" ? <View style={styles.actions}><Button title="Edit" variant="outline" disabled={Boolean(deleting)} onPress={edit} /><Button title="Delete" variant="danger" loading={Boolean(deleting)} onPress={remove} /></View> : null}
            </> : null}
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 15, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  amount: { color: colors.primaryStrong, fontSize: 16, fontWeight: "800", marginTop: 4 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.md },
  metric: { flex: 1, minWidth: 110, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md },
  pagination: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginVertical: spacing.md },
  error: { color: colors.danger, marginVertical: spacing.sm, lineHeight: 20 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.md },
  backdropPhone: { padding: 0, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 680, maxHeight: "90%", backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden" },
  sheetPhone: { maxHeight: "94%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sheetContent: { padding: spacing.lg },
  history: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
});
