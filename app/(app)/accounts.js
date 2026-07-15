import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import {
  LAGAT_TYPES,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  getOptionLabel,
} from "../../src/constants/accounts";
import { canManageJamaat } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing } from "../../src/theme";

const initialForm = {
  userId: "",
  paymentFor: "FMB",
  lagatType: "",
  amount: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "CASH",
  referenceNumber: "",
  notes: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function AccountsScreen() {
  const { user } = useAuth();
  const manager = canManageJamaat(user?.role);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const userOptions = useMemo(
    () =>
      users.map((item) => ({
        label: `${item.name} · ITS ${item.itsId} · Grade ${item.grade || "-"}`,
        value: item.id,
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
        const [s, p, u] = await Promise.all([
          apiRequest(endpoints.accountsSummary),
          apiRequest(endpoints.payments),
          apiRequest(endpoints.users),
        ]);
        setSummary(s);
        setPayments(p);
        setUsers(u);
      } else {
        setPayments(await apiRequest(endpoints.myPayments));
      }
    } catch (e) {
      setError(e.message);
    }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      userId: item.userId,
      paymentFor: item.paymentFor,
      lagatType: item.lagatType || "",
      amount: String(item.amount),
      paymentDate: item.paymentDate,
      paymentMethod: item.paymentMethod || "CASH",
      referenceNumber: item.referenceNumber || "",
      notes: item.notes || "",
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.userId) return setError("Please select a user.");
    if (form.paymentFor === "LAGAT" && !form.lagatType) {
      return setError("Please select a Lagat type.");
    }
    if (!form.amount || Number(form.amount) <= 0) {
      return setError("Enter a valid amount.");
    }

    try {
      setError("");
      await apiRequest(
        editingId ? endpoints.paymentById(editingId) : endpoints.payments,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            amount: Number(form.amount),
            lagatType: form.paymentFor === "LAGAT" ? form.lagatType : null,
          }),
        },
      );
      setEditingId(null);
      setForm(initialForm);
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await apiRequest(endpoints.paymentById(id), { method: "DELETE" });
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={styles.title}>
            {manager ? "Accounts & payments" : "My payments"}
          </Text>
          <Text style={styles.subtitle}>
            {manager
              ? "Record member payments and generate receipts."
              : "Only payments linked to your authenticated ITS profile are shown."}
          </Text>
        </View>
        {manager ? (
          <Button
            title={showForm ? "Close" : "Add payment"}
            onPress={() => {
              setEditingId(null);
              setForm(initialForm);
              setShowForm(!showForm);
            }}
          />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {manager && summary ? (
        <View style={styles.summary}>
          <Card style={styles.summaryCard}>
            <Text>Total received</Text>
            <Text style={styles.amount}>{money(summary.totalReceived)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text>This month</Text>
            <Text style={styles.amount}>{money(summary.monthReceived)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text>Entries</Text>
            <Text style={styles.amount}>{summary.paymentCount || 0}</Text>
          </Card>
        </View>
      ) : null}

      {manager && showForm ? (
        <Card>
          <Text style={styles.sectionTitle}>
            {editingId ? "Edit payment" : "New payment"}
          </Text>
          <Select
            label="User"
            value={form.userId}
            options={userOptions}
            onChange={(userId) => setForm((v) => ({ ...v, userId }))}
          />
          <Select
            label="Payment for"
            value={form.paymentFor}
            options={PAYMENT_TYPES}
            onChange={(paymentFor) =>
              setForm((v) => ({
                ...v,
                paymentFor,
                lagatType: paymentFor === "LAGAT" ? v.lagatType : "",
              }))
            }
          />
          {form.paymentFor === "LAGAT" ? (
            <Select
              label="Lagat type"
              value={form.lagatType}
              options={LAGAT_TYPES}
              onChange={(lagatType) => setForm((v) => ({ ...v, lagatType }))}
            />
          ) : null}
          <Input
            label="Amount"
            value={form.amount}
            keyboardType="decimal-pad"
            onChangeText={(amount) => setForm((v) => ({ ...v, amount }))}
          />
          <Input
            label="Payment date (YYYY-MM-DD)"
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
            title={editingId ? "Update payment" : "Save & generate receipt"}
            onPress={save}
          />
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Payment history</Text>
      {!payments.length ? (
        <Card>
          <Text>No payment entries found.</Text>
        </Card>
      ) : null}

      {payments.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.paymentTitle}>
                {getOptionLabel(PAYMENT_TYPES, item.paymentFor)}
                {item.paymentFor === "LAGAT"
                  ? ` · ${getOptionLabel(LAGAT_TYPES, item.lagatType)}`
                  : ""}
              </Text>
              {manager ? (
                <Text style={styles.member}>
                  {item.userName} · ITS {item.itsId} · Grade{" "}
                  {item.userGrade || "-"}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                Receipt {item.receiptNumber || "Pending"} · {item.paymentDate}
              </Text>
              <Text style={styles.meta}>
                {getOptionLabel(PAYMENT_METHODS, item.paymentMethod)}
                {item.referenceNumber ? ` · ${item.referenceNumber}` : ""}
              </Text>
            </View>
            <Text style={styles.paymentAmount}>{money(item.amount)}</Text>
          </View>

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                title="View receipt"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/receipt",
                    params: { paymentId: item.id },
                  })
                }
              />
            </View>
            {manager ? (
              <>
                <View style={styles.action}>
                  <Button title="Edit" onPress={() => edit(item)} />
                </View>
                <View style={styles.action}>
                  <Button
                    title="Delete"
                    variant="danger"
                    onPress={() =>
                      Alert.alert(
                        "Delete payment?",
                        "This entry and receipt will be removed.",
                        [
                          { text: "Cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => remove(item.id),
                          },
                        ],
                      )
                    }
                  />
                </View>
              </>
            ) : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  flex: { flex: 1 },
  title: { fontSize: 25, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md },
  summary: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  summaryCard: { minWidth: 170, flex: 1, marginHorizontal: 4 },
  amount: { fontSize: 21, fontWeight: "800", color: colors.primary },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row" },
  paymentTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  member: { color: colors.primary, fontWeight: "700", marginTop: 4 },
  meta: { color: colors.muted, marginTop: 4 },
  paymentAmount: { fontSize: 18, fontWeight: "800", color: colors.primary },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.md,
    marginHorizontal: -4,
  },
  action: { flexGrow: 1, minWidth: 115, marginHorizontal: 4, marginBottom: 8 },
});
