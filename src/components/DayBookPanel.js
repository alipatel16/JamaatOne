import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { accountsApi } from "../api/accountsApi";
import { ENTRY_TYPES } from "../constants/accounts";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import Select from "./Select";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  entryType: "DEBIT",
  paymentFor: "",
  amount: "",
  paymentMethodId: "",
  paymentReferenceNo: "",
  remarks: ""
};

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

function isDebitEntry(value) {
  return String(value || "").trim().toUpperCase() === "DEBIT";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function apiFilterDate(value, endOfDay = false) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`;
}

async function confirmAction(title, message, actionLabel) {
  if (Platform.OS === "web") {
    return globalThis.confirm?.(`${title}\n\n${message}`) ?? false;
  }

  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      {
        text: actionLabel,
        style: "destructive",
        onPress: () => resolve(true)
      }
    ]);
  });
}

export default function DayBookPanel({ manager, canDelete = false, canRefund = false, filters = {} }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const [methods, setMethods] = useState([]);
  const [entries, setEntries] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [entryTypeFilter, setEntryTypeFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logs, setLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const methodOptions = useMemo(
    () =>
      methods
        .filter(item => item.isActive !== false)
        .map(item => ({
          label: item.paymentMethodName || `Method ${item.paymentMethodId}`,
          value: String(item.paymentMethodId)
        })),
    [methods]
  );

  const filterMethodOptions = useMemo(
    () => [{ label: "All payment methods", value: "" }, ...methodOptions],
    [methodOptions]
  );

  const typeFilterOptions = useMemo(
    () => [{ label: "All entry types", value: "" }, ...ENTRY_TYPES],
    []
  );

  const visibleEntries = useMemo(() => {
    const query = String(filters.search || "").trim().toLowerCase();
    if (!query) return entries;

    // The current Day Book GET API has no `search` query parameter, so text
    // search can only be applied to the currently loaded server page.
    return entries.filter(item =>
      [
        item.paymentFor,
        item.paymentMethodName,
        item.paymentReferenceNo,
        item.remarks,
        item.entryType,
        item.createdByName,
        item.createdByItsNo
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [entries, filters.search]);

  useEffect(() => {
    loadMethods();
  }, []);

  useEffect(() => {
    setPageNumber(1);
    loadEntries(1);
  }, [
    filters.fromDate,
    filters.toDate,
    entryTypeFilter,
    paymentMethodFilter
  ]);

  useEffect(() => {
    if (pageNumber !== 1) loadEntries(pageNumber);
  }, [pageNumber]);

  async function loadMethods() {
    try {
      const result = await accountsApi.getPaymentMethods();
      setMethods(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment methods.");
    }
  }

  async function loadEntries(page = 1) {
    try {
      setLoading(true);
      setError("");
      const result = await accountsApi.getDaybook({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        entryType: entryTypeFilter || undefined,
        paymentMethodId: paymentMethodFilter
          ? Number(paymentMethodFilter)
          : undefined,
        fromDate: apiFilterDate(filters.fromDate),
        toDate: apiFilterDate(filters.toDate, true)
      });

      setEntries(
        (Array.isArray(result?.items) ? result.items : []).filter(
          item => item?.isActive !== false
        )
      );
      setTotalCount(Number(result?.totalCount || 0));
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (requestError) {
      setEntries([]);
      setError(requestError.message || "Unable to load Day Book entries.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentPage() {
    const nextPage = Math.min(pageNumber, totalPages || 1);
    if (nextPage !== pageNumber) setPageNumber(nextPage);
    else await loadEntries(nextPage);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function openCreate() {
    resetForm();
    await loadMethods();
    setShowForm(true);
  }

  function validateForm() {
    if (!form.entryType) return "Select an entry type.";
    if (!form.paymentFor.trim()) return "Enter payment for / account head.";
    if (!form.amount || Number(form.amount) <= 0) return "Enter a valid amount.";
    if (!form.paymentMethodId) return "Select a payment method.";
    return "";
  }

  function buildPayload() {
    return {
      entryType: form.entryType,
      paymentFor: form.paymentFor.trim(),
      amount: Number(form.amount),
      paymentMethodId: Number(form.paymentMethodId),
      paymentReferenceNo: form.paymentReferenceNo.trim() || null,
      remarks: form.remarks.trim() || null
    };
  }

  async function saveEntry() {
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = buildPayload();
      if (editingId) {
        await accountsApi.updateDaybookEntry(editingId, payload);
      } else {
        await accountsApi.createDaybookEntry(payload);
      }
      setShowForm(false);
      resetForm();
      if (pageNumber === 1) await loadEntries(1);
      else setPageNumber(1);
    } catch (requestError) {
      setError(requestError.message || "Unable to save Day Book entry.");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(dayBookId) {
    try {
      setDetailLoading(true);
      setError("");
      setDetail(await accountsApi.getDaybookEntry(dayBookId));
    } catch (requestError) {
      setError(requestError.message || "Unable to load Day Book details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function editEntry(dayBookId) {
    try {
      setDetailLoading(true);
      setError("");
      await loadMethods();
      const item = await accountsApi.getDaybookEntry(dayBookId);
      setEditingId(item.dayBookId);
      setForm({
        entryType: String(item.entryType || "DEBIT").toUpperCase(),
        paymentFor: item.paymentFor || "",
        amount: String(item.amount ?? ""),
        paymentMethodId: String(item.paymentMethodId ?? ""),
        paymentReferenceNo: item.paymentReferenceNo || "",
        remarks: item.remarks || ""
      });
      setShowForm(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to edit Day Book entry.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function refundEntry(item) {
    if (!canRefund || item?.isRefunded) return;
    const proceed = await confirmAction(
      "Refund Day Book entry?",
      `Refund Day Book entry #${item.dayBookId}? The entry stays in history and is marked refunded.`,
      "Refund"
    );
    if (!proceed) return;

    try {
      setError("");
      await accountsApi.refundDaybookEntry(item.dayBookId);
      await refreshCurrentPage();
      if (detail?.dayBookId === item.dayBookId) {
        setDetail(await accountsApi.getDaybookEntry(item.dayBookId));
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to refund Day Book entry.");
    }
  }

  async function deleteEntry(item) {
    if (!canDelete) return;
    const proceed = await confirmAction(
      "Delete Day Book entry?",
      `Delete Day Book entry #${item.dayBookId}? This action cannot be undone.`,
      "Delete"
    );
    if (!proceed) return;

    try {
      setError("");
      await accountsApi.deleteDaybookEntry(item.dayBookId);
      setEntries(current =>
        current.filter(entry => entry.dayBookId !== item.dayBookId)
      );
      if (detail?.dayBookId === item.dayBookId) setDetail(null);
      await refreshCurrentPage();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete Day Book entry.");
    }
  }

  async function openLogs(dayBookId) {
    try {
      setLogsLoading(true);
      setError("");
      const result = await accountsApi.getDaybookLogs(dayBookId);
      setLogs({
        dayBookId,
        items: Array.isArray(result) ? result : []
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load Day Book logs.");
    } finally {
      setLogsLoading(false);
    }
  }

  return (
    <View>
      <View style={[styles.panelHeader, phone && styles.panelHeaderPhone]}>
        <View style={styles.flex}>
          <Text style={styles.title}>Day Book</Text>
          <Text style={styles.subtitle}>
            {totalCount} entr{totalCount === 1 ? "y" : "ies"}
          </Text>
        </View>
        {manager ? (
          <Button title="Add debit / credit entry" compact onPress={openCreate} style={phone && styles.headerButtonPhone} />
        ) : null}
      </View>

      <Card style={styles.serverFilters}>
        <Text style={styles.filterTitle}>Day Book filters</Text>
        <View style={styles.filterGrid}>
          <View style={[styles.filterCell, phone && styles.filterCellPhone]}>
            <Select
              label="Entry type"
              value={entryTypeFilter}
              options={typeFilterOptions}
              onChange={setEntryTypeFilter}
            />
          </View>
          <View style={[styles.filterCell, phone && styles.filterCellPhone]}>
            <Select
              label="Payment method"
              value={paymentMethodFilter}
              options={filterMethodOptions}
              onChange={setPaymentMethodFilter}
            />
          </View>
        </View>
        {entryTypeFilter || paymentMethodFilter ? (
          <Button
            title="Clear Day Book filters"
            compact
            variant="outline"
            onPress={() => {
              setEntryTypeFilter("");
              setPaymentMethodFilter("");
            }}
          />
        ) : null}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}

      {visibleEntries.map(item => (
        <Card key={String(item.dayBookId)} style={styles.entryCard}>
          <View style={[styles.row, phone && styles.rowPhone]}>
            <View style={styles.flex}>
              <Text style={styles.entryTitle}>{item.paymentFor || "Day Book entry"}</Text>
              <Text style={styles.meta}>
                {item.paymentMethodName || "-"} · {formatDateTime(item.createdAt)}
              </Text>
              {item.paymentReferenceNo ? (
                <Text style={styles.meta}>Ref: {item.paymentReferenceNo}</Text>
              ) : null}
              {item.remarks ? <Text style={styles.meta}>{item.remarks}</Text> : null}
              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.typeBadge,
                    isDebitEntry(item.entryType) ? styles.debitBadge : styles.creditBadge
                  ]}
                >
                  {item.entryType || "-"}
                </Text>
                {item.isRefunded ? (
                  <Text style={styles.refundedBadge}>REFUNDED</Text>
                ) : null}
              </View>
            </View>
            <Text
              style={[
                styles.amount,
                phone && styles.amountPhone,
                isDebitEntry(item.entryType) && styles.debitAmount
              ]}
            >
              {isDebitEntry(item.entryType) ? "−" : "+"}
              {money(item.amount)}
            </Text>
          </View>

          {manager ? (
            <View style={styles.actions}>
              <Button
                title="Details"
                compact
                variant="outline"
                onPress={() => openDetail(item.dayBookId)}
              />
              <Button
                title="Edit"
                compact
                variant="outline"
                onPress={() => editEntry(item.dayBookId)}
              />
              <Button
                title="Logs"
                compact
                variant="outline"
                onPress={() => openLogs(item.dayBookId)}
              />
              {canRefund && !item.isRefunded ? (
                <Button
                  title="Refund"
                  compact
                  variant="danger"
                  onPress={() => refundEntry(item)}
                />
              ) : null}
              {canDelete ? (
                <Button
                  title="Delete"
                  compact
                  variant="danger"
                  onPress={() => deleteEntry(item)}
                />
              ) : null}
            </View>
          ) : null}
        </Card>
      ))}

      {!loading && !visibleEntries.length ? (
        <Card>
          <Text style={styles.meta}>No Day Book entries found.</Text>
        </Card>
      ) : null}

      <View style={[styles.pagination, narrow && styles.paginationNarrow]}>
        <Button
          title="Previous"
          compact
          variant="outline"
          disabled={loading || pageNumber <= 1}
          onPress={() => setPageNumber(page => Math.max(1, page - 1))}
        />
        <Text style={styles.pageText}>
          {pageNumber} / {totalPages}
        </Text>
        <Button
          title="Next"
          compact
          variant="outline"
          disabled={loading || pageNumber >= totalPages}
          onPress={() => setPageNumber(page => Math.min(totalPages, page + 1))}
        />
      </View>

      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setShowForm(false)}
      >
        <KeyboardAvoidingView
          style={[styles.backdrop, phone && styles.backdropPhone]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.formSheet, phone && styles.formSheetPhone]}>
            <View style={[styles.modalHeader, phone && styles.modalHeaderPhone]}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>
                  {editingId ? "Edit Day Book entry" : "Add debit / credit entry"}
                </Text>
                <Text style={styles.subtitle}>
                  Record a debit or credit entry with its payment method and details.
                </Text>
              </View>
              <Pressable disabled={saving} onPress={() => setShowForm(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <Select
                label="Entry type"
                value={form.entryType}
                options={ENTRY_TYPES}
                onChange={entryType =>
                  setForm(current => ({ ...current, entryType }))
                }
              />
              <Input
                label="Payment for / account head"
                value={form.paymentFor}
                placeholder="Electricity, salary, donation income..."
                onChangeText={paymentFor =>
                  setForm(current => ({ ...current, paymentFor }))
                }
              />
              <Input
                label="Amount"
                value={form.amount}
                keyboardType="decimal-pad"
                onChangeText={amount => setForm(current => ({ ...current, amount }))}
              />
              <Select
                label="Payment method"
                value={form.paymentMethodId}
                options={methodOptions}
                onChange={paymentMethodId =>
                  setForm(current => ({ ...current, paymentMethodId }))
                }
                placeholder="Select payment method"
              />
              <Input
                label="Reference number"
                value={form.paymentReferenceNo}
                onChangeText={paymentReferenceNo =>
                  setForm(current => ({ ...current, paymentReferenceNo }))
                }
              />
              <Input
                label="Remarks"
                value={form.remarks}
                multiline
                onChangeText={remarks => setForm(current => ({ ...current, remarks }))}
              />
              <Button
                title={editingId ? "Update entry" : "Save entry"}
                loading={saving}
                onPress={saveEntry}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(detail) || detailLoading}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <View style={[styles.backdrop, phone && styles.backdropPhone]}>
          <View style={[styles.detailSheet, phone && styles.detailSheetPhone]}>
            {detailLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : detail ? (
              <ScrollView>
                <View style={[styles.modalHeader, phone && styles.modalHeaderPhone]}>
                  <View style={styles.flex}>
                    <Text style={styles.modalTitle}>Day Book #{detail.dayBookId}</Text>
                    <Text style={styles.subtitle}>
                      {detail.entryType || "-"}{detail.isRefunded ? " · Refunded" : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setDetail(null)}>
                    <Text style={styles.close}>×</Text>
                  </Pressable>
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Payment for</Text>
                  <Text style={styles.detailValue}>{detail.paymentFor || "-"}</Text>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      isDebitEntry(detail.entryType) && styles.debitAmount
                    ]}
                  >
                    {isDebitEntry(detail.entryType) ? "−" : "+"}
                    {money(detail.amount)}
                  </Text>
                  <Text style={styles.detailLabel}>Payment method</Text>
                  <Text style={styles.detailValue}>{detail.paymentMethodName || "-"}</Text>
                  <Text style={styles.detailLabel}>Reference</Text>
                  <Text style={styles.detailValue}>{detail.paymentReferenceNo || "-"}</Text>
                  <Text style={styles.detailLabel}>Remarks</Text>
                  <Text style={styles.detailValue}>{detail.remarks || "-"}</Text>
                  <Text style={styles.detailLabel}>Recorded by</Text>
                  <Text style={styles.detailValue}>
                    {detail.createdByName || "-"}
                    {detail.createdByItsNo ? ` · ITS ${detail.createdByItsNo}` : ""}
                  </Text>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{formatDateTime(detail.createdAt)}</Text>
                  {detail.updatedAt ? (
                    <>
                      <Text style={styles.detailLabel}>Last updated by</Text>
                      <Text style={styles.detailValue}>
                        {detail.updatedByName || "-"}
                        {detail.updatedByItsNo ? ` · ITS ${detail.updatedByItsNo}` : ""}
                      </Text>
                      <Text style={styles.detailLabel}>Last updated</Text>
                      <Text style={styles.detailValue}>{formatDateTime(detail.updatedAt)}</Text>
                    </>
                  ) : null}

                  {manager ? (
                    <View style={styles.detailActions}>
                      <Button
                        title="Edit entry"
                        variant="outline"
                        onPress={() => {
                          const id = detail.dayBookId;
                          setDetail(null);
                          editEntry(id);
                        }}
                      />
                      <Button
                        title="View logs"
                        variant="outline"
                        onPress={() => {
                          const id = detail.dayBookId;
                          setDetail(null);
                          openLogs(id);
                        }}
                      />
                      {canRefund && !detail.isRefunded ? (
                        <Button
                          title="Refund entry"
                          variant="danger"
                          onPress={() => refundEntry(detail)}
                        />
                      ) : null}
                      {canDelete ? (
                        <Button
                          title="Delete entry"
                          variant="danger"
                          onPress={() => deleteEntry(detail)}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(logs) || logsLoading}
        transparent
        animationType="fade"
        onRequestClose={() => setLogs(null)}
      >
        <View style={[styles.backdrop, phone && styles.backdropPhone]}>
          <View style={[styles.detailSheet, phone && styles.detailSheetPhone]}>
            {logsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : logs ? (
              <ScrollView>
                <View style={[styles.modalHeader, phone && styles.modalHeaderPhone]}>
                  <View style={styles.flex}>
                    <Text style={styles.modalTitle}>Day Book #{logs.dayBookId} logs</Text>
                    <Text style={styles.subtitle}>{logs.items.length} audit entries</Text>
                  </View>
                  <Pressable onPress={() => setLogs(null)}>
                    <Text style={styles.close}>×</Text>
                  </Pressable>
                </View>
                <View style={styles.detailContent}>
                  {logs.items.map(log => (
                    <Card key={String(log.dayBookLogId)} style={styles.logCard}>
                      <Text style={styles.entryTitle}>{log.actionType || "Action"}</Text>
                      <Text style={styles.meta}>
                        {log.performedByName || `User ${log.performedBy}`} · {formatDateTime(log.performedAt)}
                      </Text>
                      {log.oldData ? (
                        <>
                          <Text style={styles.detailLabel}>Old data</Text>
                          <Text style={styles.logData}>{log.oldData}</Text>
                        </>
                      ) : null}
                      {log.newData ? (
                        <>
                          <Text style={styles.detailLabel}>New data</Text>
                          <Text style={styles.logData}>{log.newData}</Text>
                        </>
                      ) : null}
                    </Card>
                  ))}
                  {!logs.items.length ? (
                    <Text style={styles.meta}>No logs found for this entry.</Text>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  panelHeaderPhone: { alignItems: "stretch", flexWrap: "wrap", gap: spacing.sm },
  headerButtonPhone: { width: "100%" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.muted, marginTop: 3, fontSize: 12 },
  serverFilters: { marginBottom: spacing.md },
  filterTitle: { color: colors.text, fontWeight: "800", marginBottom: spacing.sm },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  filterCell: { flex: 1, minWidth: 220 },
  filterCellPhone: { minWidth: "100%" },
  error: { color: colors.danger, marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  entryCard: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowPhone: { flexWrap: "wrap", gap: spacing.sm },
  entryTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  amount: { color: colors.primaryStrong, fontWeight: "900", fontSize: 17 },
  amountPhone: { width: "100%", marginTop: spacing.xs },
  debitAmount: { color: colors.danger },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800"
  },
  debitBadge: { color: colors.danger, backgroundColor: colors.dangerSoft },
  creditBadge: { color: colors.primaryStrong, backgroundColor: colors.primarySoft },
  refundedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    backgroundColor: colors.background
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md
  },
  pageText: { color: colors.muted, fontWeight: "700" },
  paginationNarrow: { gap: spacing.xs },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.4)",
    justifyContent: "center",
    padding: spacing.md
  },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  formSheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  formSheetPhone: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  detailSheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "88%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  detailSheetPhone: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  modalHeaderPhone: { padding: spacing.md },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  close: { color: colors.muted, fontSize: 30, lineHeight: 30 },
  formScroll: { flexGrow: 0 },
  formContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  detailContent: { padding: spacing.lg },
  detailLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: spacing.md
  },
  detailValue: { color: colors.text, fontSize: 15, marginTop: 4 },
  detailActions: { gap: spacing.sm, marginTop: spacing.xl },
  logCard: { marginBottom: spacing.md },
  logData: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  }
});
