import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import SearchableSelect from "../../src/components/SearchableSelect";
import {
  DONATION_TYPES,
  ENTRY_TYPES,
  LAGAT_TYPES,
  MADRASA_FEE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  getOptionLabel,
  getPaymentSubtypeOptions,
} from "../../src/constants/accounts";
import { canManageJamaat } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing } from "../../src/theme";
const today = () => new Date().toISOString().slice(0, 10);
const initialPayment = {
  userId: "",
  paymentFor: "FMB",
  subType: "",
  amount: "",
  paymentDate: today(),
  paymentMethod: "CASH",
  referenceNumber: "",
  notes: "",
};
const initialEntry = {
  entryType: "DEBIT",
  category: "",
  amount: "",
  entryDate: today(),
  paymentMethod: "CASH",
  referenceNumber: "",
  notes: "",
};
const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
export default function AccountsScreen() {
  const { user } = useAuth();
  const manager = canManageJamaat(user?.role);
  const [tab, setTab] = useState("PAYMENTS");
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [daybook, setDaybook] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [form, setForm] = useState(initialPayment);
  const [entry, setEntry] = useState(initialEntry);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");
  const userOptions = useMemo(
    () =>
      users.map((x) => ({
        label: `${x.name} · ITS ${x.itsId} · ${x.phoneNumber || "No phone"} · Grade ${x.grade || "-"}`,
        value: x.id,
        searchText: `${x.name} ${x.lastName} ${x.itsId} ${x.phoneNumber}`,
      })),
    [users],
  );
  useEffect(() => {
    loadData();
  }, [manager]);
  async function loadData() {
    try {
      setError("");
      if (manager) {
        const [s, p, u, d, l] = await Promise.all([
          apiRequest(endpoints.accountsSummary),
          apiRequest(endpoints.payments),
          apiRequest(endpoints.users),
          apiRequest(endpoints.daybook),
          apiRequest(endpoints.ledgers),
        ]);
        setSummary(s);
        setPayments(p);
        setUsers(u);
        setDaybook(d);
        setLedgers(l);
      } else setPayments(await apiRequest(endpoints.myPayments));
    } catch (e) {
      setError(e.message);
    }
  }
  const filteredPayments = useMemo(
    () =>
      payments.filter((x) => {
        const q = search.trim().toLowerCase();
        const text =
          `${x.userName} ${x.itsId} ${x.receiptNumber} ${x.paymentFor} ${x.subType || x.lagatType || ""}`.toLowerCase();
        return (
          (!q || text.includes(q)) &&
          (!fromDate || x.paymentDate >= fromDate) &&
          (!toDate || x.paymentDate <= toDate)
        );
      }),
    [payments, search, fromDate, toDate],
  );
  const filteredEntries = useMemo(
    () =>
      daybook.filter((x) => {
        const q = search.trim().toLowerCase();
        const text =
          `${x.category} ${x.notes} ${x.referenceNumber} ${x.entryType}`.toLowerCase();
        return (
          (!q || text.includes(q)) &&
          (!fromDate || x.entryDate >= fromDate) &&
          (!toDate || x.entryDate <= toDate)
        );
      }),
    [daybook, search, fromDate, toDate],
  );
  const filteredLedgers = useMemo(
    () =>
      ledgers.filter((x) => {
        const q = search.trim().toLowerCase();
        return (
          !q ||
          `${x.userName} ${x.itsId} ${x.phoneNumber}`.toLowerCase().includes(q)
        );
      }),
    [ledgers, search],
  );
  function changePaymentFor(paymentFor) {
    setForm((v) => ({ ...v, paymentFor, subType: "" }));
  }
  async function savePayment() {
    const subtypeOptions = getPaymentSubtypeOptions(form.paymentFor);
    if (!form.userId) return setError("Please select a member.");
    if (subtypeOptions.length && !form.subType)
      return setError("Please select the payment type.");
    if (!form.amount || Number(form.amount) <= 0)
      return setError("Enter a valid amount.");
    try {
      await apiRequest(
        editingId ? endpoints.paymentById(editingId) : endpoints.payments,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            amount: Number(form.amount),
            lagatType: form.paymentFor === "LAGAT" ? form.subType : null,
          }),
        },
      );
      setForm(initialPayment);
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }
  function editPayment(x) {
    setEditingId(x.id);
    setForm({
      userId: x.userId,
      paymentFor: x.paymentFor,
      subType: x.subType || x.lagatType || "",
      amount: String(x.amount),
      paymentDate: x.paymentDate,
      paymentMethod: x.paymentMethod || "CASH",
      referenceNumber: x.referenceNumber || "",
      notes: x.notes || "",
    });
    setShowForm(true);
  }
  async function saveEntry() {
    if (!entry.category.trim())
      return setError("Enter a category or account head.");
    if (!entry.amount || Number(entry.amount) <= 0)
      return setError("Enter a valid amount.");
    try {
      await apiRequest(endpoints.daybook, {
        method: "POST",
        body: JSON.stringify({ ...entry, amount: Number(entry.amount) }),
      });
      setEntry(initialEntry);
      setShowEntry(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }
  async function removePayment(id) {
    await apiRequest(endpoints.paymentById(id), { method: "DELETE" });
    await loadData();
  }
  const subtypeOptions = getPaymentSubtypeOptions(form.paymentFor);
  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={styles.title}>
            {manager ? "Accounts" : "My payments"}
          </Text>
          <Text style={styles.subtitle}>
            {manager
              ? "Payments, customer ledgers and daily debit/credit entries."
              : "Payments linked to your ITS profile."}
          </Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {manager ? (
        <View style={styles.tabs}>
          {[
            ["PAYMENTS", "Payments"],
            ["DAYBOOK", "Day book"],
            ["LEDGERS", "Customer ledgers"],
          ].map(([v, l]) => (
            <Pressable
              key={v}
              style={[styles.tab, tab === v && styles.activeTab]}
              onPress={() => {
                setTab(v);
                setSearch("");
              }}
            >
              <Text style={[styles.tabText, tab === v && styles.activeTabText]}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {manager && summary ? (
        <View style={styles.summary}>
          <Card style={styles.summaryCard}>
            <Text>Total received</Text>
            <Text style={styles.amount}>{money(summary.totalReceived)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text>Total expenses</Text>
            <Text style={styles.amount}>{money(summary.totalDebit)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text>Cash balance</Text>
            <Text style={styles.amount}>{money(summary.balance)}</Text>
          </Card>
        </View>
      ) : null}
      <Card>
        <Input
          label={
            tab === "LEDGERS"
              ? "Search customer ledger"
              : "Search payments / entries"
          }
          value={search}
          onChangeText={setSearch}
          placeholder={
            tab === "LEDGERS"
              ? "Name, ITS ID or phone"
              : "Member, ITS ID, receipt, category or reference"
          }
        />
        {tab !== "LEDGERS" ? (
          <View style={styles.filterRow}>
            <View style={styles.filter}>
              <Input
                label="From date"
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.filter}>
              <Input
                label="To date"
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        ) : null}
      </Card>
      {tab === "PAYMENTS" ? (
        <>
          {manager ? (
            <Button
              title={showForm ? "Close payment form" : "Add payment"}
              onPress={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setForm(initialPayment);
              }}
            />
          ) : null}
          {manager && showForm ? (
            <View style={styles.formContainer}>
              <Card>
                <Text style={styles.sectionTitle}>
                  {editingId ? "Edit payment" : "New payment"}
                </Text>
                <SearchableSelect
                  label="Search and select member"
                  value={form.userId}
                  options={userOptions}
                  onChange={(userId) => setForm((v) => ({ ...v, userId }))}
                />
                <Select
                  label="Payment for"
                  value={form.paymentFor}
                  options={PAYMENT_TYPES}
                  onChange={changePaymentFor}
                />
                {subtypeOptions.length ? (
                  <Select
                    label={
                      form.paymentFor === "DONATION_HUB"
                        ? "Donation type"
                        : form.paymentFor === "MADRASA_FEE"
                          ? "Madrasa fee type"
                          : "Lagat type"
                    }
                    value={form.subType}
                    options={subtypeOptions}
                    onChange={(subType) => setForm((v) => ({ ...v, subType }))}
                  />
                ) : null}
                <Input
                  label="Amount"
                  value={form.amount}
                  keyboardType="decimal-pad"
                  onChangeText={(amount) => setForm((v) => ({ ...v, amount }))}
                />
                <Input
                  label="Payment date"
                  value={form.paymentDate}
                  onChangeText={(paymentDate) =>
                    setForm((v) => ({ ...v, paymentDate }))
                  }
                />
                <Select
                  label="Payment method"
                  value={form.paymentMethod}
                  options={PAYMENT_METHODS}
                  onChange={(paymentMethod) =>
                    setForm((v) => ({ ...v, paymentMethod }))
                  }
                />
                <Input
                  label="Reference / cheque / UPI number"
                  value={form.referenceNumber}
                  onChangeText={(referenceNumber) =>
                    setForm((v) => ({ ...v, referenceNumber }))
                  }
                />
                <Input
                  label="Notes"
                  value={form.notes}
                  multiline
                  onChangeText={(notes) => setForm((v) => ({ ...v, notes }))}
                />
                <Button
                  title={
                    editingId ? "Update payment" : "Save & generate receipt"
                  }
                  onPress={savePayment}
                />
              </Card>
            </View>
          ) : null}
          <Text style={styles.sectionTitle}>
            Payment history ({filteredPayments.length})
          </Text>
          {filteredPayments.map((x) => (
            <Card key={x.id}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.paymentTitle}>
                    {getOptionLabel(PAYMENT_TYPES, x.paymentFor)}
                    {x.subType || x.lagatType
                      ? ` · ${getOptionLabel(x.paymentFor === "LAGAT" ? LAGAT_TYPES : x.paymentFor === "DONATION_HUB" ? DONATION_TYPES : MADRASA_FEE_TYPES, x.subType || x.lagatType)}`
                      : ""}
                  </Text>
                  {manager ? (
                    <Text style={styles.member}>
                      {x.userName} · ITS {x.itsId}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    {x.paymentDate} · Receipt {x.receiptNumber || "Pending"}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>{money(x.amount)}</Text>
              </View>
              <View style={styles.actions}>
                <Button
                  title="Receipt"
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/receipt",
                      params: { paymentId: x.id },
                    })
                  }
                />
                {manager ? (
                  <>
                    <Button title="Edit" onPress={() => editPayment(x)} />
                    <Button
                      title="Delete"
                      variant="danger"
                      onPress={() =>
                        Alert.alert(
                          "Delete payment?",
                          "This payment and receipt will be removed.",
                          [
                            { text: "Cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => removePayment(x.id),
                            },
                          ],
                        )
                      }
                    />
                  </>
                ) : null}
              </View>
            </Card>
          ))}
        </>
      ) : null}
      {manager && tab === "DAYBOOK" ? (
        <>
          <Button
            title={showEntry ? "Close entry form" : "Add debit / credit entry"}
            onPress={() => setShowEntry(!showEntry)}
          />
          {showEntry ? (
            <View style={styles.formContainer}>
              <Card>
                <Text style={styles.sectionTitle}>Daily account entry</Text>
                <Select
                  label="Entry type"
                  value={entry.entryType}
                  options={ENTRY_TYPES}
                  onChange={(entryType) =>
                    setEntry((v) => ({ ...v, entryType }))
                  }
                />
                <Input
                  label="Category / account head"
                  value={entry.category}
                  onChangeText={(category) =>
                    setEntry((v) => ({ ...v, category }))
                  }
                  placeholder="Electricity, salary, donation income..."
                />
                <Input
                  label="Amount"
                  value={entry.amount}
                  keyboardType="decimal-pad"
                  onChangeText={(amount) => setEntry((v) => ({ ...v, amount }))}
                />
                <Input
                  label="Entry date"
                  value={entry.entryDate}
                  onChangeText={(entryDate) =>
                    setEntry((v) => ({ ...v, entryDate }))
                  }
                />
                <Select
                  label="Payment method"
                  value={entry.paymentMethod}
                  options={PAYMENT_METHODS}
                  onChange={(paymentMethod) =>
                    setEntry((v) => ({ ...v, paymentMethod }))
                  }
                />
                <Input
                  label="Reference number"
                  value={entry.referenceNumber}
                  onChangeText={(referenceNumber) =>
                    setEntry((v) => ({ ...v, referenceNumber }))
                  }
                />
                <Input
                  label="Notes"
                  value={entry.notes}
                  multiline
                  onChangeText={(notes) => setEntry((v) => ({ ...v, notes }))}
                />
                <Button title="Save entry" onPress={saveEntry} />
              </Card>
            </View>
          ) : null}
          <Text style={styles.sectionTitle}>
            Day-by-day entries ({filteredEntries.length})
          </Text>
          {filteredEntries.map((x) => (
            <Card key={x.id}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.paymentTitle}>{x.category}</Text>
                  <Text style={styles.meta}>
                    {x.entryDate} ·{" "}
                    {getOptionLabel(PAYMENT_METHODS, x.paymentMethod)}
                  </Text>
                  <Text style={styles.meta}>{x.notes || "No notes"}</Text>
                </View>
                <Text
                  style={[
                    styles.paymentAmount,
                    x.entryType === "DEBIT" && styles.debit,
                  ]}
                >
                  {x.entryType === "DEBIT" ? "−" : "+"}
                  {money(x.amount)}
                </Text>
              </View>
            </Card>
          ))}
        </>
      ) : null}
      {manager && tab === "LEDGERS" ? (
        <>
          <Text style={styles.sectionTitle}>
            Customer ledgers ({filteredLedgers.length})
          </Text>
          {filteredLedgers.map((x) => (
            <Pressable
              key={x.userId}
              onPress={() =>
                router.push({
                  pathname: "/(app)/user-detail",
                  params: { userId: x.userId },
                })
              }
            >
              <Card>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.paymentTitle}>{x.userName}</Text>
                    <Text style={styles.meta}>
                      ITS {x.itsId} · {x.phoneNumber || "No phone"}
                    </Text>
                    <Text style={styles.meta}>
                      {x.paymentCount} payments · Last payment{" "}
                      {x.lastPaymentDate || "-"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.ledgerLabel}>Total paid</Text>
                    <Text style={styles.paymentAmount}>
                      {money(x.totalPaid)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  flex: { flex: 1 },
  title: { fontSize: 25, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
    gap: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: "700" },
  activeTabText: { color: "white" },
  summary: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  summaryCard: { minWidth: 170, flex: 1, marginHorizontal: 4 },
  amount: { fontSize: 21, fontWeight: "800", color: colors.primary },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  filter: { flex: 1, minWidth: 180, marginHorizontal: 4 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row", gap: 12 },
  paymentTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  member: { color: colors.primary, fontWeight: "700", marginTop: 4 },
  meta: { color: colors.muted, marginTop: 4 },
  paymentAmount: { fontSize: 18, fontWeight: "800", color: colors.primary },
  debit: { color: colors.danger },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.md,
  },
  ledgerLabel: { fontSize: 12, color: colors.muted, textAlign: "right" },
  formContainer: {
    marginTop: spacing.md,
  },
});
