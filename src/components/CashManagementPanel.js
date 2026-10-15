import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { colors, radius, shadows, spacing } from "../theme";
import ActivityTimeline from "./ActivityTimeline";
import Button from "./Button";
import Card from "./Card";
import CollectionSummaryDashboard from "./CollectionSummaryDashboard";
import Input from "./Input";
import Select from "./Select";
import { selectedChequeDeposit } from "../utils/chequeDeposit";

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

function getBalanceType(paymentMethodName) {
  const normalized = String(paymentMethodName || "").trim().toLowerCase();
  if (normalized.includes("cash")) return "Cash";
  if (normalized.includes("cheque") || normalized.includes("check")) return "Cheque";
  return "";
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

export default function CashManagementPanel({ canEdit = false, canDelete = false, mode = "overview" }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const router = useRouter();
  const { user } = useAuth();
  const showOverview = mode === "overview";
  const showBanking = mode === "banking";
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
  const [depositError, setDepositError] = useState("");
  const [cheques, setCheques] = useState([]);
  const [selectedChequeIds, setSelectedChequeIds] = useState([]);
  const [chequePage, setChequePage] = useState(0);
  const [chequeTotalPages, setChequeTotalPages] = useState(1);
  const [chequesLoading, setChequesLoading] = useState(false);
  const [chequesError, setChequesError] = useState("");
  const chequeRequest = useRef(0);

  const chequeDeposit = !editingDepositId && getBalanceType(paymentMethods.find(
    item => String(item.paymentMethodId) === String(depositForm.paymentMethodId)
  )?.paymentMethodName) === "Cheque";
  const chequeTotal = cheques.reduce((sum, item) =>
    selectedChequeIds.includes(String(item.chequeId))
      ? sum + Math.round(Number(item.amount || 0) * 100) : sum, 0) / 100;

  async function loadCheques(pageNumber = 1, requestId = chequeRequest.current) {
    setChequesLoading(true);
    setChequesError("");
    try {
      const result = await accountsApi.getCheques({
        pageNumber, pageSize: PAGE_SIZE,
        bankAccountId: Number(depositForm.bankAccountId), mine: true
      });
      if (requestId !== chequeRequest.current) return;
      const items = (Array.isArray(result?.items) ? result.items : []).filter(
        item => item?.chequeId && !item.bankDepositId && !item.spentDayBookId &&
          String(item.bankAccountId) === String(depositForm.bankAccountId)
      );
      setCheques(current => {
        const unique = new Map((pageNumber === 1 ? [] : current).map(item => [String(item.chequeId), item]));
        items.forEach(item => unique.set(String(item.chequeId), item));
        return [...unique.values()];
      });
      setChequePage(pageNumber);
      setChequeTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (requestError) {
      if (requestId === chequeRequest.current) {
        setChequesError(requestError.message || "Unable to load undeposited cheques.");
      }
    } finally {
      if (requestId === chequeRequest.current) setChequesLoading(false);
    }
  }

  useEffect(() => {
    const requestId = ++chequeRequest.current;
    setCheques([]);
    setSelectedChequeIds([]);
    setChequePage(0);
    setChequeTotalPages(1);
    setChequesError("");
    setChequesLoading(false);
    if (depositModal && chequeDeposit && depositForm.bankAccountId) {
      loadCheques(1, requestId);
    }
    return () => { chequeRequest.current += 1; };
  }, [depositModal, chequeDeposit, depositForm.bankAccountId, depositForm.paymentMethodId]);

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
      const [collectionResult, bankResult, methodResult] = await Promise.all([
        accountsApi.getCollectionSummary({ pageNumber: 1, pageSize: 20 }),
        accountsApi.getBankAccounts(),
        accountsApi.getPaymentMethods()
      ]);
      setCollectionSummary(collectionResult || null);
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
      paymentMethods
        .filter(item => Boolean(getBalanceType(item?.paymentMethodName)))
        .map(item => ({
          value: String(item.paymentMethodId),
          label: item.paymentMethodName || `Method ${item.paymentMethodId}`
        })),
    [paymentMethods]
  );

  const myPendingRows = useMemo(() => {
    const userId = user?.userId ?? user?.id;
    if (userId === undefined || userId === null || userId === "") return [];
    return (Array.isArray(collectionSummary?.pendingByUser)
      ? collectionSummary.pendingByUser
      : []
    ).filter(item => String(item?.userId) === String(userId));
  }, [collectionSummary, user?.id, user?.userId]);

  const myPendingBalances = useMemo(
    () =>
      myPendingRows.reduce(
        (totals, item) => {
          const type = getBalanceType(item?.balanceType);
          const amount = Number(item?.estimatedPendingAmount || 0);
          if (type === "Cash") totals.cash += amount;
          if (type === "Cheque") totals.cheque += amount;
          return totals;
        },
        { cash: 0, cheque: 0 }
      ),
    [myPendingRows]
  );

  const selectedPending = useMemo(() => {
    const selectedMethod = paymentMethods.find(
      item => String(item.paymentMethodId) === String(depositForm.paymentMethodId)
    );
    const selectedBank = bankAccounts.find(
      item => String(item.bankAccountId) === String(depositForm.bankAccountId)
    );
    const balanceType = getBalanceType(selectedMethod?.paymentMethodName);
    if (!balanceType) {
      return {
        balanceType,
        ownPending: null,
        bankPending: null,
        available: null,
        source: ""
      };
    }

    const matchingRows = myPendingRows.filter(item => {
      const sameType = getBalanceType(item?.balanceType) === balanceType;
      const sameBank = selectedBank
        ? String(item?.bankAccountId) === String(selectedBank.bankAccountId)
        : true;
      return sameType && sameBank;
    });
    const available = matchingRows.reduce(
      (sum, item) => sum + Number(item?.estimatedPendingAmount || 0),
      0
    );

    return {
      balanceType,
      ownPending: available,
      bankPending: available,
      available,
      source: selectedBank
        ? `your pending ${balanceType.toLowerCase()} for ${selectedBank.bankAccountName || selectedBank.bankName || "the selected bank"}`
        : `your pending ${balanceType.toLowerCase()}`
    };
  }, [bankAccounts, depositForm.bankAccountId, depositForm.paymentMethodId, myPendingRows, paymentMethods]);

  function openCreateDeposit() {
    setEditingDepositId(null);
    setDepositError("");
    setDepositForm({
      ...EMPTY_DEPOSIT,
      paymentMethodId: paymentMethodOptions[0]?.value || "",
      bankAccountId: bankOptions[0]?.value || ""
    });
    setDepositModal(true);
  }

  function openEditDeposit(item) {
    if (!canEdit) return;
    setEditingDepositId(item.bankDepositId);
    setDepositError("");
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
    let amount = Number(depositForm.amount);
    let chequeSelection = null;
    if (!depositForm.paymentMethodId || !depositForm.bankAccountId) {
      setDepositError("Select a payment method and bank account.");
      return;
    }
    if (chequeDeposit) {
      if (chequesLoading || chequesError) {
        setDepositError("Wait for the cheque list to load, or retry loading it.");
        return;
      }
      try {
        chequeSelection = selectedChequeDeposit(selectedChequeIds, cheques);
        amount = chequeSelection.amount;
      } catch (selectionError) {
        setDepositError(selectionError.message);
        return;
      }
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositError("Enter a valid deposit amount.");
      return;
    }

    const existing = editingDepositId
      ? deposits.find(item => item.bankDepositId === editingDepositId)
      : null;
    const existingMatchesSelection = existing &&
      String(existing.bankAccountId) === String(depositForm.bankAccountId) &&
      String(existing.paymentMethodId) === String(depositForm.paymentMethodId);
    const available = selectedPending.available == null
      ? null
      : Number(selectedPending.available || 0) + (existingMatchesSelection ? Number(existing?.amount || 0) : 0);
    if (!chequeDeposit && available != null && amount > available) {
      setDepositError(
        `Deposit cannot exceed ${money(available)} available from ${selectedPending.source || "the current pending balance"}.`
      );
      return;
    }

    const payload = {
      ...depositForm,
      amount,
      ...(chequeSelection ? { chequeIds: chequeSelection.chequeIds } : {}),
      depositDate: toApiDate(depositForm.depositDate)
    };

    try {
      setDepositSaving(true);
      setDepositError("");
      if (editingDepositId) {
        if (!canEdit) {
          setDepositError("You do not have permission to edit bank deposits.");
          return;
        }
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
      setDepositError(requestError.message || "Unable to save the bank deposit.");
    } finally {
      setDepositSaving(false);
    }
  }

  async function removeDeposit(item) {
    if (!canDelete) return;
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
              {canEdit ? (
                <Button
                  title="Edit"
                  compact
                  variant="outline"
                  onPress={() => openEditDeposit(item)}
                />
              ) : null}
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
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>
                {editingDepositId ? "Edit bank deposit" : "Record bank deposit"}
              </Text>
              {depositError ? (
                <View style={styles.modalErrorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={21} color={colors.danger} />
                  <View style={styles.flex}>
                    <Text style={styles.modalErrorTitle}>Action required</Text>
                    <Text style={styles.modalErrorText}>{depositError}</Text>
                  </View>
                </View>
              ) : null}

              <View style={[styles.pendingAvailability, phone && styles.pendingAvailabilityPhone]}>
                <View style={styles.pendingAvailabilityHeader}>
                  <View style={styles.pendingAvailabilityIcon}>
                    <MaterialCommunityIcons name="account-cash-outline" size={20} color={colors.primaryStrong} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.pendingAvailabilityTitle}>Available to deposit</Text>
                    <Text style={styles.pendingAvailabilitySubtitle}>Current cash and cheque on hand before recording this bank deposit.</Text>
                  </View>
                </View>
                <View style={[styles.pendingAvailabilityGrid, narrow && styles.pendingAvailabilityGridNarrow]}>
                  <View style={styles.pendingAvailabilityItem}>
                    <Text style={styles.pendingAvailabilityLabel}>Cash on Hand</Text>
                    <Text style={styles.pendingAvailabilityValue}>{money(myPendingBalances.cash)}</Text>
                  </View>
                  <View style={styles.pendingAvailabilityItem}>
                    <Text style={styles.pendingAvailabilityLabel}>Cheque on Hand</Text>
                    <Text style={styles.pendingAvailabilityValue}>{money(myPendingBalances.cheque)}</Text>
                  </View>
                </View>
                {selectedPending.balanceType ? (
                  <View style={styles.selectedPendingLine}>
                    <Text style={styles.selectedPendingLabel}>
                      {selectedPending.balanceType} available for selected bank
                    </Text>
                    <Text style={styles.selectedPendingValue}>
                      {money(selectedPending.available || 0)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Select
                label="Payment method"
                value={depositForm.paymentMethodId}
                options={paymentMethodOptions}
                onChange={paymentMethodId => {
                  setDepositError("");
                  setSelectedChequeIds([]);
                  setDepositForm(value => ({ ...value, paymentMethodId }));
                }}
                disabled={depositSaving}
              />
              <Select
                label="Bank account"
                value={depositForm.bankAccountId}
                options={bankOptions}
                onChange={bankAccountId => {
                  setDepositError("");
                  setSelectedChequeIds([]);
                  setDepositForm(value => ({ ...value, bankAccountId }));
                }}
                disabled={depositSaving}
              />
              {chequeDeposit ? (
                <View style={styles.chequeSection}>
                  <Select
                    label="Undeposited cheques"
                    value=""
                    options={cheques.filter(item => !selectedChequeIds.includes(String(item.chequeId))).map(item => ({
                      value: String(item.chequeId),
                      label: `${item.chequeNo || `Cheque #${item.chequeId}`} · ${money(item.amount)}${item.muminName ? ` · ${item.muminName}` : ""}${item.drawerBank ? ` · ${item.drawerBank}` : ""}`
                    }))}
                    placeholder={chequesLoading ? "Loading cheques…" : "Select a cheque to add"}
                    disabled={chequesLoading || depositSaving || !depositForm.bankAccountId || Boolean(chequesError)}
                    onChange={id => {
                      setDepositError("");
                      setSelectedChequeIds(current => current.includes(id) ? current : [...current, id]);
                    }}
                  />
                  {chequesLoading ? <ActivityIndicator color={colors.primary} /> : null}
                  {chequesError ? (
                    <View style={styles.chequeMessage}>
                      <Text style={styles.error}>{chequesError}</Text>
                      <Button title="Retry loading cheques" compact variant="outline" onPress={() => loadCheques(chequePage ? chequePage + 1 : 1)} />
                    </View>
                  ) : null}
                  {!chequesLoading && !chequesError && !cheques.length ? (
                    <Text style={styles.chequeHelp}>No undeposited cheques are available in your name for this bank account.</Text>
                  ) : null}
                  {cheques.filter(item => selectedChequeIds.includes(String(item.chequeId))).map(item => (
                    <View key={String(item.chequeId)} style={styles.selectedCheque}>
                      <View style={styles.flex}>
                        <Text style={styles.chequeNumber}>{item.chequeNo || `Cheque #${item.chequeId}`}</Text>
                        {item.muminName ? <Text style={styles.meta}>{item.muminName}</Text> : null}
                        <Text style={styles.chequeAmount}>{money(item.amount)}</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove cheque ${item.chequeNo || item.chequeId}`}
                        disabled={depositSaving}
                        style={styles.chequeRemove}
                        onPress={() => {
                          setDepositError("");
                          setSelectedChequeIds(current => current.filter(id => id !== String(item.chequeId)));
                        }}
                      >
                        <MaterialCommunityIcons name="close" size={20} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                  {chequePage > 0 && chequePage < chequeTotalPages && !chequesError ? (
                    <Button title="Load more cheques" compact variant="outline" disabled={chequesLoading || depositSaving} onPress={() => loadCheques(chequePage + 1)} />
                  ) : null}
                  <View style={styles.chequeTotal}>
                    <Text style={styles.chequeHelp}>{selectedChequeIds.length} selected · Deposit total</Text>
                    <Text style={styles.chequeAmount}>{money(chequeTotal)}</Text>
                  </View>
                </View>
              ) : <Input
                label="Amount"
                value={depositForm.amount}
                keyboardType="decimal-pad"
                helperText={selectedPending.available != null ? `Available now: ${money(selectedPending.available)}` : undefined}
                onChangeText={amount => {
                  setDepositError("");
                  setDepositForm(value => ({ ...value, amount }));
                }}
              />}
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
                  disabled={chequeDeposit && (chequesLoading || Boolean(chequesError) || !selectedChequeIds.length)}
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
  chequeSection: { marginBottom: spacing.md, gap: spacing.xs },
  chequeMessage: { gap: spacing.xs },
  chequeHelp: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  selectedCheque: { flexDirection: "row", alignItems: "center", padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, gap: spacing.sm },
  chequeNumber: { color: colors.text, fontSize: 14, fontWeight: "800" },
  chequeAmount: { color: colors.primaryStrong, fontSize: 16, fontWeight: "800", marginTop: 3 },
  chequeRemove: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.dangerSoft },
  chequeTotal: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, gap: 3 },
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
  modalScrollContent: { paddingBottom: spacing.xs },
  modalErrorBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#F0C9C9",
    backgroundColor: colors.dangerSoft
  },
  modalErrorTitle: { color: colors.danger, fontSize: 13, fontWeight: "900" },
  modalErrorText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 2 },
  pendingAvailability: {
    width: "100%",
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoftStrong,
    backgroundColor: colors.surfaceTint
  },
  pendingAvailabilityPhone: { padding: spacing.sm },
  pendingAvailabilityHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  pendingAvailabilityIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pendingAvailabilityTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  pendingAvailabilitySubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  pendingAvailabilityGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pendingAvailabilityGridNarrow: { flexDirection: "column" },
  pendingAvailabilityItem: { flex: 1, minWidth: 0, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface },
  pendingAvailabilityLabel: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  pendingAvailabilityValue: { color: colors.primaryStrong, fontSize: 17, fontWeight: "900", marginTop: 3 },
  selectedPendingLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.primarySoftStrong },
  selectedPendingLabel: { color: colors.textSoft, fontSize: 11, fontWeight: "800", flex: 1, minWidth: 150 },
  selectedPendingValue: { color: colors.primaryStrong, fontSize: 13, fontWeight: "900" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  timelineHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  timelineTitle: { marginBottom: 2 },
  timelineContent: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  logItem: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  logData: { color: colors.text, fontSize: 12, marginTop: spacing.xs }
});
