import React, { useEffect, useMemo, useState } from "react";
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

import { accountsApi } from "../api/accountsApi";
import { colors, radius, shadows, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import MultiSelect from "./MultiSelect";

const EMPTY_BANK = {
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  accountHolderName: "",
  ifscCode: "",
  branchName: "",
  remarks: "",
  openingBalance: "0",
  categoryIds: []
};

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

function maskedAccount(value) {
  if (!value) return "Account number not provided";
  const text = String(value);
  if (text.length <= 4) return text;
  return `•••• ${text.slice(-4)}`;
}

function initials(value) {
  const words = String(value || "Bank")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join("") || "BK";
}

export default function BankAccountsPanel({ canManage = false, canDelete = false }) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const phone = width < 600;
  const narrow = width < 380;
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_BANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const activeAccounts = useMemo(
    () => accounts.filter(item => item?.isActive !== false),
    [accounts]
  );

  const categoryOptions = useMemo(
    () =>
      categories
        .filter(item => item?.isActive !== false)
        .map(item => ({
          value: String(item.categoryId),
          label: item.categoryName || `Category ${item.categoryId}`,
          searchText: item.jamaatName || ""
        })),
    [categories]
  );

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");
      const [result, categoryResult] = await Promise.all([
        accountsApi.getBankAccounts(),
        accountsApi.getPaymentCategories()
      ]);
      setAccounts(
        (Array.isArray(result) ? result : []).filter(item => item?.isActive !== false)
      );
      setCategories(
        (Array.isArray(categoryResult) ? categoryResult : []).filter(
          item => item?.isActive !== false
        )
      );
    } catch (requestError) {
      setAccounts([]);
      setError(requestError.message || "Unable to load bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_BANK);
    setError("");
    setModalVisible(true);
  }

  function openEdit(item) {
    setEditingId(item.bankAccountId);
    setForm({
      bankAccountName: item.bankAccountName || "",
      bankName: item.bankName || "",
      bankAccountNumber: item.bankAccountNumber || "",
      accountHolderName: item.accountHolderName || "",
      ifscCode: item.ifscCode || "",
      branchName: item.branchName || "",
      remarks: item.remarks || "",
      openingBalance: String(item.openingBalance ?? 0),
      categoryIds: (Array.isArray(item.categories) ? item.categories : []).map(
        category => String(category.categoryId)
      )
    });
    setError("");
    setModalVisible(true);
  }

  async function save() {
    if (!form.bankAccountName.trim() || !form.bankName.trim()) {
      setError("Bank account name and bank name are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editingId) {
        const updated = await accountsApi.updateBankAccount(editingId, form);
        setAccounts(current =>
          updated?.isActive === false
            ? current.filter(item => item.bankAccountId !== editingId)
            : current.map(item =>
                item.bankAccountId === editingId ? updated : item
              )
        );
      } else {
        const created = await accountsApi.createBankAccount(form);
        if (created?.isActive !== false) {
          setAccounts(current => [created, ...current]);
        }
      }
      setModalVisible(false);
      await loadAccounts();
    } catch (requestError) {
      setError(requestError.message || "Unable to save the bank account.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!canDelete) return;
    const proceed = await confirmAction(
      "Delete bank account",
      `Delete ${item.bankAccountName || item.bankName || "this bank account"}?`,
      "Delete"
    );
    if (!proceed) return;

    try {
      setError("");
      await accountsApi.deleteBankAccount(item.bankAccountId);
      setAccounts(current =>
        current.filter(account => account.bankAccountId !== item.bankAccountId)
      );
      await loadAccounts();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete the bank account.");
    }
  }

  return (
    <View>
      <View style={[styles.hero, phone && styles.heroPhone, narrow && styles.heroNarrow]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>CASH MANAGEMENT</Text>
          <Text style={styles.heroTitle}>Bank accounts</Text>
          <Text style={styles.heroSubtitle}>
            Manage the Jamaat bank accounts available when recording cash deposits.
          </Text>
        </View>
        <View style={[styles.heroCount, phone && styles.heroCountPhone]}>
          <Text style={styles.heroCountValue}>{activeAccounts.length}</Text>
          <Text style={styles.heroCountLabel}>ACTIVE</Text>
        </View>
      </View>

      <View style={[styles.toolbar, phone && styles.toolbarPhone]}>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>Configured accounts</Text>
          <Text style={styles.meta}>Only active accounts are shown.</Text>
        </View>
        {canManage ? (
          <Button title="Add bank account" compact onPress={openCreate} style={phone && styles.toolbarButtonPhone} />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : activeAccounts.length ? (
        <View style={styles.grid}>
          {activeAccounts.map(item => (
            <Card
              key={String(item.bankAccountId)}
              style={[styles.accountCard, wide && styles.accountCardWide]}
            >
              <View style={[styles.cardTop, narrow && styles.cardTopNarrow]}>
                <View style={styles.bankMark}>
                  <Text style={styles.bankMarkText}>
                    {initials(item.bankName || item.bankAccountName)}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.accountLabel}>
                    {item.bankAccountName || item.bankName || "Bank account"}
                  </Text>
                  <Text style={styles.bankName}>{item.bankName || "-"}</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>

              <View style={styles.accountNumberBox}>
                <Text style={styles.accountNumberLabel}>ACCOUNT</Text>
                <Text style={styles.accountNumber}>
                  {maskedAccount(item.bankAccountNumber)}
                </Text>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Account holder</Text>
                  <Text style={styles.detailValue}>{item.accountHolderName || "-"}</Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>IFSC</Text>
                  <Text style={styles.detailValue}>{item.ifscCode || "-"}</Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Branch</Text>
                  <Text style={styles.detailValue}>{item.branchName || "-"}</Text>
                </View>
              </View>

              {Array.isArray(item.categories) && item.categories.length ? (
                <View style={styles.categoryBox}>
                  <Text style={styles.detailLabel}>Payment categories</Text>
                  <View style={styles.categoryChips}>
                    {item.categories.map(category => (
                      <View key={String(category.categoryId)} style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>
                          {category.categoryName || `Category ${category.categoryId}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {item.remarks ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksText}>{item.remarks}</Text>
                </View>
              ) : null}

              {canManage ? (
                <View style={styles.actions}>
                  <Button
                    title="Edit account"
                    compact
                    variant="outline"
                    onPress={() => openEdit(item)}
                  />
                  {canDelete ? (
                    <Button
                      title="Delete"
                      compact
                      variant="danger"
                      onPress={() => remove(item)}
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No bank accounts yet</Text>
          <Text style={styles.emptyText}>
            Add the first Jamaat bank account before recording bank deposits.
          </Text>
          {canManage ? (
            <Button title="Add bank account" compact onPress={openCreate} />
          ) : null}
        </Card>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !saving && setModalVisible(false)}
      >
        <Pressable
          style={[styles.backdrop, phone && styles.backdropPhone]}
          onPress={() => !saving && setModalVisible(false)}
        >
          <Pressable style={[styles.modalCard, phone && styles.modalCardPhone]} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={styles.flex}>
                  <Text style={styles.modalEyebrow}>BANK ACCOUNT</Text>
                  <Text style={styles.modalTitle}>
                    {editingId ? "Edit account" : "Add account"}
                  </Text>
                </View>
                <Pressable onPress={() => !saving && setModalVisible(false)}>
                  <Text style={styles.close}>×</Text>
                </Pressable>
              </View>

              <Input
                label="Account label"
                value={form.bankAccountName}
                placeholder="e.g. Jamaat main account"
                onChangeText={bankAccountName =>
                  setForm(value => ({ ...value, bankAccountName }))
                }
              />
              <Input
                label="Bank name"
                value={form.bankName}
                onChangeText={bankName => setForm(value => ({ ...value, bankName }))}
              />
              <Input
                label="Account number"
                value={form.bankAccountNumber}
                keyboardType="number-pad"
                onChangeText={bankAccountNumber =>
                  setForm(value => ({ ...value, bankAccountNumber }))
                }
              />
              <Input
                label="Account holder name"
                value={form.accountHolderName}
                onChangeText={accountHolderName =>
                  setForm(value => ({ ...value, accountHolderName }))
                }
              />
              <Input
                label="IFSC code"
                value={form.ifscCode}
                autoCapitalize="characters"
                onChangeText={ifscCode => setForm(value => ({ ...value, ifscCode }))}
              />
              <Input
                label="Branch name"
                value={form.branchName}
                onChangeText={branchName => setForm(value => ({ ...value, branchName }))}
              />
              <MultiSelect
                label="Payment categories"
                values={form.categoryIds}
                options={categoryOptions}
                onChange={categoryIds =>
                  setForm(value => ({ ...value, categoryIds }))
                }
                placeholder="Select payment categories for this account"
                searchPlaceholder="Search payment categories"
              />
              <Input
                label="Remarks"
                value={form.remarks}
                multiline
                onChangeText={remarks => setForm(value => ({ ...value, remarks }))}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                />
                <Button
                  title={editingId ? "Update account" : "Add account"}
                  loading={saving}
                  onPress={save}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryStrong,
    marginBottom: spacing.lg,
    ...shadows.card
  },
  heroPhone: { padding: spacing.md, gap: spacing.md, alignItems: "flex-start" },
  heroNarrow: { flexDirection: "column" },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: "#D8E6E0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: spacing.xs
  },
  heroTitle: { color: "#FFFFFF", fontSize: 27, fontWeight: "800" },
  heroSubtitle: { color: "#DDE6E2", marginTop: spacing.xs, lineHeight: 20 },
  heroCount: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,.11)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.16)"
  },
  heroCountPhone: { width: 68, height: 68, borderRadius: 20 },
  heroCountValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  heroCountLabel: { color: "#D8E6E0", fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  toolbarPhone: { alignItems: "stretch", flexWrap: "wrap" },
  toolbarButtonPhone: { width: "100%" },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing.xs },
  accountCard: { width: "100%", marginHorizontal: spacing.xs, marginBottom: spacing.sm },
  accountCardWide: { width: "48.5%" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTopNarrow: { flexWrap: "wrap", alignItems: "flex-start" },
  bankMark: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  bankMarkText: { color: colors.warning, fontWeight: "900", fontSize: 15 },
  accountLabel: { color: colors.text, fontSize: 17, fontWeight: "800" },
  bankName: { color: colors.muted, fontSize: 12, marginTop: 2 },
  activeBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999
  },
  activeBadgeText: { color: colors.success, fontSize: 10, fontWeight: "800" },
  accountNumberBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md
  },
  accountNumberLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  accountNumber: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 4, letterSpacing: 1.1 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.md, gap: spacing.md },
  detailBlock: { minWidth: 130, flex: 1 },
  detailLabel: { color: colors.muted, fontSize: 11 },
  detailValue: { color: colors.text, fontWeight: "700", marginTop: 3, fontSize: 13 },
  categoryBox: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  categoryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.xs },
  categoryChip: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  categoryChipText: { color: colors.primaryStrong, fontSize: 10, fontWeight: "800" },
  remarksBox: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  remarksText: { color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: spacing.xs },
  emptyText: { color: colors.muted, textAlign: "center", marginBottom: spacing.md, maxWidth: 460 },
  loader: { marginVertical: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.md },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.45)", justifyContent: "center", padding: spacing.md },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  modalCard: { width: "100%", maxWidth: 680, maxHeight: "90%", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  modalCardPhone: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.md },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  modalEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  modalTitle: { color: colors.text, fontSize: 23, fontWeight: "800", marginTop: 3 },
  close: { color: colors.muted, fontSize: 30, paddingHorizontal: spacing.sm },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }
});
