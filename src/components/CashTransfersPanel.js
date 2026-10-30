import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { accountsApi } from "../api/accountsApi";
import { usersApi } from "../api/usersApi";
import { cashTransferPayload } from "../utils/cashTransfer";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import Select from "./Select";
import MultiSelect from "./MultiSelect";

const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
const empty = fromUserId => ({ fromUserId: String(fromUserId || ""), bankAccountId: "", toUserId: "", cashAmount: "", chequeIds: [], remarks: "" });

export default function CashTransfersPanel({ initialSender = null, onTransferred }) {
  const [form, setForm] = useState(() => empty(initialSender?.userId));
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [memberPages, setMemberPages] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [holdings, setHoldings] = useState(null);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState("");
  const [holdingsRevision, setHoldingsRevision] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef(0);

  useEffect(() => {
    let active = true;
    if (initialSender) return undefined;
    setMembersLoading(true);
    usersApi.getCommitteeMembers({ pageNumber: memberPage, pageSize: 20, search: query }).then(result => {
      if (active) { setMembers(Array.isArray(result?.items) ? result.items : []); setMemberPages(Math.max(1, Number(result?.totalPages || 1))); }
    }).catch(error => { if (active) setError(error.message || "Unable to load committee members."); })
      .finally(() => { if (active) setMembersLoading(false); });
    return () => { active = false; };
  }, [initialSender, memberPage, query]);

  useEffect(() => {
    let active = true;
    setHoldings(null); setHoldingsError("");
    if (!form.fromUserId) { setHoldingsLoading(false); return undefined; }
    setHoldingsLoading(true);
    accountsApi.getUserHoldings(form.fromUserId).then(result => { if (active) setHoldings(result); })
      .catch(error => { if (active) setHoldingsError(error.message || "Unable to load holdings."); })
      .finally(() => { if (active) setHoldingsLoading(false); });
    return () => { active = false; };
  }, [form.fromUserId, holdingsRevision]);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true); setHistoryError("");
    setDetail(null); setDetailError(""); setDetailLoading(false);
    accountsApi.getCashTransfers({ pageNumber: page, pageSize: 20, fromUserId: form.fromUserId || undefined }).then(result => {
      if (active) { setHistory(Array.isArray(result?.items) ? result.items : []); setPages(Math.max(1, Number(result?.totalPages || 1))); }
    }).catch(error => { if (active) { setHistory([]); setHistoryError(error.message || "Unable to load transfers."); } })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; detailRequest.current += 1; };
  }, [page, form.fromUserId, holdingsRevision]);

  const accounts = Array.isArray(holdings?.accounts) ? holdings.accounts : [];
  const account = accounts.find(item => String(item.bankAccountId) === form.bankAccountId);

  async function save() {
    if (saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      cashTransferPayload(form, account);
      // Holdings can change while this form is open. Validate against fresh data.
      const fresh = await accountsApi.getUserHoldings(form.fromUserId);
      const freshAccount = (fresh?.accounts || []).find(item => String(item.bankAccountId) === form.bankAccountId);
      const payload = cashTransferPayload(form, freshAccount);
      await accountsApi.createCashTransfer(payload);
      setForm(empty(form.fromUserId)); setPage(1); setHoldingsRevision(value => value + 1);
      setSuccess("Transfer recorded. Holdings have been refreshed."); onTransferred?.();
    } catch (error) { setError(error.message || "Unable to record cash transfer."); }
    finally { setSaving(false); }
  }

  async function showDetail(item) {
    const request = ++detailRequest.current;
    setDetail(null); setDetailError(""); setDetailLoading(true);
    try { const result = await accountsApi.getCashTransfer(item.transferId); if (request === detailRequest.current) setDetail(result); }
    catch (error) { if (request === detailRequest.current) setDetailError(error.message || "Unable to load transfer details."); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  }

  return <View style={styles.section}>
    <Text style={styles.title}>Cash & cheque transfers</Text>
    <Text style={styles.meta}>Move holdings to another eligible committee member before changing category access or deactivating an account.</Text>
    <Card>
      {initialSender ? <Text style={styles.name}>Sender: {initialSender.name}</Text> : <>
        <Input label="Find sender" value={search} onChangeText={setSearch} placeholder="Name or ITS" editable={!saving} />
        <Button title="Search members" compact variant="outline" disabled={saving || membersLoading} onPress={() => { setQuery(search.trim()); setMemberPage(1); }} />
        <Select label="Sender" value={form.fromUserId} options={members.map(item => ({ value: String(item.userId), label: `${item.name} · ${item.itsNo}${item.isActive === false ? " · Inactive" : ""}` }))} disabled={saving || membersLoading} onChange={id => { setForm(empty(id)); setError(""); setSuccess(""); setPage(1); }} />
        <View style={styles.actions}><Button title="Previous members" compact variant="outline" disabled={saving || membersLoading || memberPage <= 1} onPress={() => setMemberPage(value => value - 1)} /><Text style={styles.meta}>{memberPage} / {memberPages}</Text><Button title="Next members" compact variant="outline" disabled={saving || membersLoading || memberPage >= memberPages} onPress={() => setMemberPage(value => value + 1)} /></View>
      </>}
      {holdingsLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {holdingsError ? <Text style={styles.error}>{holdingsError}</Text> : null}
      {form.fromUserId ? <Button title="Refresh holdings" compact variant="outline" disabled={saving || holdingsLoading} onPress={() => setHoldingsRevision(value => value + 1)} /> : null}
      {holdings && !holdings.hasPendingMoney ? <Text style={styles.meta}>No pending cash or cheques are held by this member.</Text> : null}
      <Select label="Bank account" value={form.bankAccountId} options={accounts.map(item => ({ value: String(item.bankAccountId), label: `${item.bankAccountName} · Cash ${money(item.pendingCash)} · Cheques ${money(item.chequesInHandAmount)}` }))} disabled={saving || holdingsLoading || !holdings} onChange={id => setForm(current => ({ ...current, bankAccountId: id, toUserId: "", cashAmount: "", chequeIds: [] }))} />
      {account ? <>
        <Select label="Receiving committee member" value={form.toUserId} options={(account.eligibleReceivers || []).filter(item => String(item.userId) !== form.fromUserId).map(item => ({ value: String(item.userId), label: `${item.name} · ${item.itsNo}` }))} disabled={saving} onChange={id => setForm(current => ({ ...current, toUserId: id }))} />
        <Input label="Cash amount" value={form.cashAmount} keyboardType="decimal-pad" editable={!saving} helperText={`Available: ${money(account.pendingCash)}`} onChangeText={value => setForm(current => ({ ...current, cashAmount: value }))} />
        <MultiSelect label="Cheques to transfer" values={form.chequeIds} options={(account.cheques || []).map(item => ({ value: String(item.chequeId), label: `${item.chequeNo || `Cheque #${item.chequeId}`} · ${money(item.amount)}` }))} disabled={saving} onChange={ids => setForm(current => ({ ...current, chequeIds: ids }))} />
        <Input label="Remarks" value={form.remarks} maxLength={500} multiline editable={!saving} onChangeText={value => setForm(current => ({ ...current, remarks: value }))} />
      </> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <Button title="Record transfer" loading={saving} disabled={!account || holdingsLoading || Boolean(holdingsError)} onPress={save} />
    </Card>
    <Text style={styles.name}>Transfer history</Text>
    {historyLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {historyError ? <Text style={styles.error}>{historyError}</Text> : null}
    {history.map(item => <Card key={String(item.transferId)}>
      <Text style={styles.name}>{item.fromUserName} → {item.toUserName}</Text>
      <Text style={styles.meta}>{item.bankAccountName} · {String(item.createdAt || "").slice(0, 10)}</Text>
      <Text style={styles.meta}>Cash {money(item.cashAmount)} · Cheques {money(item.chequeAmount)} · Total {money(item.totalAmount)}</Text>
      <Button title="Details" compact variant="outline" onPress={() => showDetail(item)} />
    </Card>)}
    {!historyLoading && !historyError && !history.length ? <Text style={styles.meta}>No transfers found.</Text> : null}
    <View style={styles.actions}><Button title="Previous transfers" compact variant="outline" disabled={historyLoading || page <= 1} onPress={() => setPage(value => value - 1)} /><Text style={styles.meta}>{page} / {pages}</Text><Button title="Next transfers" compact variant="outline" disabled={historyLoading || page >= pages} onPress={() => setPage(value => value + 1)} /></View>
    {detailLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {detailError ? <Text style={styles.error}>{detailError}</Text> : null}
    {detail ? <Card>
      <Text style={styles.name}>Transfer #{detail.transferId} · {money(detail.totalAmount)}</Text>
      <Text style={styles.meta}>{detail.fromUserName} → {detail.toUserName} · {detail.bankAccountName}</Text>
      <Text style={styles.meta}>{detail.remarks}</Text>
      {(detail.cheques || []).map(item => <Text key={String(item.chequeId)} style={styles.meta}>{item.chequeNo} · {item.drawerBank} · {money(item.amount)}</Text>)}
      <Button title="Close details" compact variant="outline" onPress={() => { detailRequest.current += 1; setDetail(null); }} />
    </Card> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  name: { color: colors.text, fontSize: 15, fontWeight: "800", marginVertical: spacing.xs },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  error: { color: colors.danger, marginVertical: spacing.sm },
  success: { color: colors.success, marginVertical: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, marginVertical: spacing.sm }
});
