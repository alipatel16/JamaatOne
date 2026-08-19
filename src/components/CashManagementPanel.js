import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { accountsApi } from "../api/accountsApi";
import { colors, radius, shadows, spacing } from "../theme";
import ActivityTimeline from "./ActivityTimeline";
import Button from "./Button";
import Card from "./Card";
import CollectionSummaryDashboard from "./CollectionSummaryDashboard";
import Input from "./Input";
import Select from "./Select";

const PAGE_SIZE = 20;
const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_DEPOSIT = {
  paymentMethodId: "",
  bankAccountId: "",
  amount: "",
  depositDate: today(),
  depositReferenceNo: "",
  remarks: ""
};

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

function toApiDate(value) {
  if (!value) return null;
  return `${value}T00:00:00`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function confirmAction(title, message, actionLabel = "Delete") {
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

export default function CashManagementPanel({ canDelete = false, mode = "overview" }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const router = useRouter();
  const showOverview = mode === "overview";
  const showBanking = mode === "banking";
  const [cashSummary, setCashSummary] = useState([]);
  const [collectionSummary, setCollectionSummary] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState("");
  const [collectionUserPage, setCollectionUserPage] = useState(1);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [depositModal, setDepositModal] = useState(false);
  const [editingDepositId, setEditingDepositId] = useState(null);
  const [depositForm, setDepositForm] = useState(EMPTY_DEPOSIT);
  const [depositSaving, setDepositSaving] = useState(false);

  const [logsVisible, setLogsVisible] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (showOverview) {
        loadCollectionSummary(1);
      }
      if (showBanking) {
        loadReferenceData();
      }
    }, [showOverview, showBanking])
  );

  useEffect(() => {
    if (showBanking) loadDeposits(page);
  }, [page, showBanking]);

  async function loadCollectionSummary(pageNumber = 1) {
    try {
      setCollectionLoading(true);
      setCollectionError("");
      const result = await accountsApi.getCollectionSummary({
        pageNumber,
        pageSize: 10
      });
      setCollectionSummary(result || null);
      setCollectionUserPage(Number(result?.byUser?.pageNumber || pageNumber || 1));
    } catch (requestError) {
      setCollectionError(
        requestError.message || "Unable to load detailed collection summary."
      );
    } finally {
      setCollectionLoading(false);
    }
  }

  async function loadReferenceData() {
    try {
      setError("");
      const [summaryResult, bankResult, methodResult] = await Promise.all([
        accountsApi.getCashSummary(),
        accountsApi.getBankAccounts(),
        accountsApi.getPaymentMethods()
      ]);
      setCashSummary(Array.isArray(summaryResult) ? summaryResult : []);
      setBankAccounts(
        (Array.isArray(bankResult) ? bankResult : []).filter(
          item => item?.isActive !== false
        )
      );
      setPaymentMethods(
        (Array.isArray(methodResult) ? methodResult : []).filter(
          item => item?.isActive !== false
        )
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to load cash management data.");
    }
  }

  async function loadDeposits(pageNumber = 1) {
    try {
      setLoading(true);
      setError("");
      const result = await accountsApi.getBankDeposits({
        pageNumber,
        pageSize: PAGE_SIZE
      });
      setDeposits(
        (Array.isArray(result?.items) ? result.items : []).filter(
          item => item?.isActive !== false
        )
      );
      setMeta({
        totalCount: Number(result?.totalCount || 0),
        totalPages: Math.max(1, Number(result?.totalPages || 1))
      });
    } catch (requestError) {
      setDeposits([]);
      setError(requestError.message || "Unable to load bank deposits.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadReferenceData(), loadDeposits(page)]);
  }

  const totals = useMemo(
    () =>
      cashSummary.reduce(
        (result, item) => ({
          collected: result.collected + Number(item.totalCollected || 0),
          deposited: result.deposited + Number(item.totalDeposited || 0),
          pending: result.pending + Number(item.pendingToDeposit || 0)
        }),
        { collected: 0, deposited: 0, pending: 0 }
      ),
    [cashSummary]
  );

  const bankOptions = useMemo(
    () =>
      bankAccounts.map(item => ({
        value: String(item.bankAccountId),
        label: `${item.bankAccountName || item.bankName || "Bank account"}${
          item.bankAccountNumber ? ` · ${item.bankAccountNumber}` : ""
        }`
      })),
    [bankAccounts]
  );

  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods.map(item => ({
        value: String(item.paymentMethodId),
        label: item.paymentMethodName || `Method ${item.paymentMethodId}`
      })),
    [paymentMethods]
  );

  function openCreateDeposit() {
    setEditingDepositId(null);
    setDepositForm({
      ...EMPTY_DEPOSIT,
      paymentMethodId: paymentMethodOptions[0]?.value || "",
      bankAccountId: bankOptions[0]?.value || ""
    });
    setDepositModal(true);
  }

  function openEditDeposit(item) {
    setEditingDepositId(item.bankDepositId);
    setDepositForm({
      paymentMethodId: String(item.paymentMethodId || ""),
      bankAccountId: String(item.bankAccountId || ""),
      amount: String(item.amount ?? ""),
      depositDate: item.depositDate ? String(item.depositDate).slice(0, 10) : today(),
      depositReferenceNo: item.depositReferenceNo || "",
      remarks: item.remarks || ""
    });
    setDepositModal(true);
  }

  async function saveDeposit() {
    const amount = Number(depositForm.amount);
    if (!depositForm.paymentMethodId || !depositForm.bankAccountId) {
      setError("Select a payment method and bank account.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    const methodSummary = cashSummary.find(
      item => String(item.paymentMethodId) === String(depositForm.paymentMethodId)
    );
    const existing = editingDepositId
      ? deposits.find(item => item.bankDepositId === editingDepositId)
      : null;
    const available =
      Number(methodSummary?.pendingToDeposit || 0) + Number(existing?.amount || 0);
    if (methodSummary && amount > available) {
      setError(`Deposit cannot exceed pending amount ${money(available)} for this method.`);
      return;
    }

    const payload = {
      ...depositForm,
      amount,
      depositDate: toApiDate(depositForm.depositDate)
    };

    try {
      setDepositSaving(true);
      setError("");
      if (editingDepositId) {
        const updated = await accountsApi.updateBankDeposit(editingDepositId, payload);
        setDeposits(current =>
          updated?.isActive === false
            ? current.filter(item => item.bankDepositId !== editingDepositId)
            : current.map(item =>
                item.bankDepositId === editingDepositId ? updated : item
              )
        );
      } else {
        const created = await accountsApi.createBankDeposit(payload);
        if (created?.isActive !== false) {
          setDeposits(current => [created, ...current].slice(0, PAGE_SIZE));
        }
      }
      setDepositModal(false);
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || "Unable to save the bank deposit.");
    } finally {
      setDepositSaving(false);
    }
  }

  async function removeDeposit(item) {
    const proceed = await confirmAction(
      "Delete deposit",
      "Delete this bank deposit entry?",
      "Delete"
    );
    if (!proceed) return;

    try {
      setError("");
      await accountsApi.deleteBankDeposit(item.bankDepositId);
      setDeposits(current =>
        current.filter(deposit => deposit.bankDepositId !== item.bankDepositId)
      );
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete the deposit.");
    }
  }

  async function viewDepositLogs(item) {
    try {
      setLogsVisible(true);
      setLogsLoading(true);
      setLogs([]);
      const result = await accountsApi.getBankDepositLogs(item.bankDepositId);
      setLogs(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load deposit timeline.");
    } finally {
      setLogsLoading(false);
    }
  }

  return (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showOverview ? (
        <CollectionSummaryDashboard
          data={collectionSummary}
          loading={collectionLoading}
          error={collectionError}
          onRetry={() => loadCollectionSummary(collectionUserPage)}
          onUserPageChange={pageNumber => {
            if (pageNumber !== collectionUserPage && !collectionLoading) {
              loadCollectionSummary(pageNumber);
            }
          }}
          userPageLoading={collectionLoading}
          title="Cash position & pending ownership"
          subtitle="Track every collection category, bank balance, deposit flow and pending amount from one place."
          collapsibleSections
          defaultCollapsed
        />
      ) : null}

      {showBanking ? (<>
      <View style={[styles.bankingHero, phone && styles.bankingHeroPhone, shadows.card]}>
        <View style={styles.bankingHeroIcon}>
          <MaterialCommunityIcons name="bank-transfer" size={27} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <Text style={styles.bankingHeroEyebrow}>BANKING OPERATIONS</Text>
          <Text style={[styles.bankingHeroTitle, phone && styles.bankingHeroTitlePhone]}>Accounts & deposits</Text>
          <Text style={styles.bankingHeroSubtitle}>
            Configure bank accounts and record deposits without losing the cash-position dashboard above.
          </Text>
        </View>
      </View>

      <Pressable onPress={() => router.push("/bank-accounts")}>
        <View style={[styles.manageCard, phone && styles.manageCardPhone, shadows.card]}>
          <View style={styles.manageIcon}>
            <MaterialCommunityIcons name="bank-outline" size={24} color={colors.primaryStrong} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.manageEyebrow}>BANK SETUP</Text>
            <Text style={styles.manageTitle}>Manage bank accounts</Text>
            <Text style={styles.manageSubtitle}>
              {bankAccounts.length
                ? `${bankAccounts.length} active account${bankAccounts.length === 1 ? "" : "s"} available for deposits.`
                : "Add a bank account before recording deposits."}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.primaryStrong} />
        </View>
      </Pressable>

      <View style={[styles.sectionHeader, phone && styles.sectionHeaderPhone]}>
        <View>
          <Text style={styles.sectionTitle}>Bank deposits</Text>
          <Text style={styles.meta}>{meta.totalCount} deposit entries</Text>
        </View>
        <Button
          title="Record bank deposit"
          compact
          disabled={!bankOptions.length || !paymentMethodOptions.length}
          onPress={openCreateDeposit}
          style={phone && styles.sectionButtonPhone}
        />
      </View>

      {!bankOptions.length ? (
        <Card>
          <Text style={styles.empty}>
            No active bank account is configured. Open Manage bank accounts first.
          </Text>
        </Card>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : deposits.length ? (
        deposits.map(item => (
          <Card key={String(item.bankDepositId)}>
            <View style={[styles.row, phone && styles.rowPhone]}>
              <View style={styles.flex}>
                <Text style={styles.title}>{item.bankAccountName || "Bank deposit"}</Text>
                <Text style={styles.meta}>
                  {item.paymentMethodName || "-"} · {formatDate(item.depositDate)}
                </Text>
                <Text style={styles.meta}>
                  {item.depositReferenceNo || "No reference"}
                  {item.createdByName ? ` · Recorded by ${item.createdByName}` : ""}
                </Text>
                {item.remarks ? <Text style={styles.meta}>{item.remarks}</Text> : null}
              </View>
              <Text style={[styles.amount, phone && styles.amountPhone]}>{money(item.amount)}</Text>
            </View>
            <View style={styles.actionsRow}>
              <Button
                title="Edit"
                compact
                variant="outline"
                onPress={() => openEditDeposit(item)}
              />
              <Button
                title="Timeline"
                compact
                variant="outline"
                onPress={() => viewDepositLogs(item)}
              />
              {canDelete ? (
                <Button
                  title="Delete"
                  compact
                  variant="danger"
                  onPress={() => removeDeposit(item)}
                />
              ) : null}
            </View>
          </Card>
        ))
      ) : (
        <Card><Text style={styles.empty}>No bank deposits recorded yet.</Text></Card>
      )}

      <View style={[styles.pagination, narrow && styles.paginationNarrow]}>
        <Button
          title="Previous"
          compact
          variant="outline"
          disabled={page <= 1 || loading}
          onPress={() => setPage(value => Math.max(1, value - 1))}
        />
        <Text style={styles.meta}>Page {page} of {meta.totalPages}</Text>
        <Button
          title="Next"
          compact
          variant="outline"
          disabled={page >= meta.totalPages || loading}
          onPress={() => setPage(value => value + 1)}
        />
      </View>
      </>) : null}

      <Modal
        visible={depositModal}
        transparent
        animationType="fade"
        onRequestClose={() => !depositSaving && setDepositModal(false)}
      >
        <Pressable
          style={[styles.backdrop, phone && styles.backdropPhone]}
          onPress={() => !depositSaving && setDepositModal(false)}
        >
          <Pressable style={[styles.modalCard, phone && styles.modalCardPhone]} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingDepositId ? "Edit bank deposit" : "Record bank deposit"}
              </Text>
              <Select
                label="Payment method"
                value={depositForm.paymentMethodId}
                options={paymentMethodOptions}
                onChange={paymentMethodId =>
                  setDepositForm(value => ({ ...value, paymentMethodId }))
                }
              />
              <Select
                label="Bank account"
                value={depositForm.bankAccountId}
                options={bankOptions}
                onChange={bankAccountId =>
                  setDepositForm(value => ({ ...value, bankAccountId }))
                }
              />
              <Input
                label="Amount"
                value={depositForm.amount}
                keyboardType="decimal-pad"
                onChangeText={amount => setDepositForm(value => ({ ...value, amount }))}
              />
              <Input
                label="Deposit date"
                value={depositForm.depositDate}
                placeholder="YYYY-MM-DD"
                onChangeText={depositDate =>
                  setDepositForm(value => ({ ...value, depositDate }))
                }
              />
              <Input
                label="Deposit reference number"
                value={depositForm.depositReferenceNo}
                onChangeText={depositReferenceNo =>
                  setDepositForm(value => ({ ...value, depositReferenceNo }))
                }
              />
              <Input
                label="Remarks"
                value={depositForm.remarks}
                multiline
                onChangeText={remarks =>
                  setDepositForm(value => ({ ...value, remarks }))
                }
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setDepositModal(false)}
                />
                <Button
                  title={editingDepositId ? "Update deposit" : "Save deposit"}
                  loading={depositSaving}
                  onPress={saveDeposit}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={logsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogsVisible(false)}
      >
        <Pressable style={[styles.backdrop, phone && styles.backdropPhone]} onPress={() => setLogsVisible(false)}>
          <Pressable style={[styles.modalCard, phone && styles.modalCardPhone]} onPress={() => {}}>
            <View style={styles.timelineHeader}>
              <View style={styles.flex}>
                <Text style={[styles.modalTitle, styles.timelineTitle]}>Deposit timeline</Text>
                <Text style={styles.meta}>
                  {logs.length} activit{logs.length === 1 ? "y" : "ies"}
                </Text>
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.timelineContent}>
              {logsLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <ActivityTimeline
                  entries={logs}
                  entityLabel="Bank deposit"
                  getKey={log => String(log.bankDepositLogId)}
                  formatDateTime={formatDateTime}
                />
              )}
            </ScrollView>
            <Button title="Close" variant="outline" onPress={() => setLogsVisible(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bankingHero: {
    minHeight: 126,
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.primaryStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  bankingHeroPhone: { padding: spacing.md, alignItems: "flex-start" },
  bankingHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  bankingHeroEyebrow: { color: "#D8E6E0", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  bankingHeroTitle: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", marginTop: 4 },
  bankingHeroTitlePhone: { fontSize: 21 },
  bankingHeroSubtitle: { color: "#DDE6E2", fontSize: 12, lineHeight: 18, marginTop: 5 },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  rowPhone: { flexWrap: "wrap", gap: spacing.sm },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  summaryCard: { flex: 1, minWidth: 180, marginHorizontal: 4 },
  summaryRowPhone: { marginHorizontal: 0, gap: spacing.sm },
  summaryCardPhone: { flexBasis: "100%", minWidth: "100%", marginHorizontal: 0 },
  label: { color: colors.muted },
  amount: { color: colors.primary, fontSize: 20, fontWeight: "800", marginTop: 4 },
  amountPhone: { width: "100%" },
  pending: { color: colors.danger },
  title: { color: colors.text, fontWeight: "800", fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm
  },
  sectionHeaderPhone: { alignItems: "stretch", flexWrap: "wrap" },
  sectionButtonPhone: { width: "100%" },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  summaryLine: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  summaryLinePhone: { alignItems: "flex-start", flexWrap: "wrap" },
  lineAmount: { color: colors.text, fontWeight: "800", textAlign: "right" },
  lineAmountPhone: { width: "100%", textAlign: "left" },
  manageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md
  },
  manageCardPhone: { padding: spacing.md, alignItems: "flex-start" },
  manageIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  manageIconText: { color: colors.warning, fontSize: 20, fontWeight: "900" },
  manageEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  manageTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 3 },
  manageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  manageArrow: { color: colors.primary, fontSize: 30, fontWeight: "400" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: spacing.md },
  loader: { marginVertical: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginVertical: spacing.md
  },
  paginationNarrow: { gap: spacing.xs },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.45)", justifyContent: "center", padding: spacing.md },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  modalCard: { width: "100%", maxWidth: 680, maxHeight: "90%", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  modalCardPhone: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.md },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: "800", marginBottom: spacing.md },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  timelineHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  timelineTitle: { marginBottom: 2 },
  timelineContent: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  logItem: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  logData: { color: colors.text, fontSize: 12, marginTop: spacing.xs }
});
