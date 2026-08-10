import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";

import { accountsApi } from "../api/accountsApi";
import { colors, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import MumineenSearchList from "./MumineenSearchList";

const PAGE_SIZE = 20;

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

function formatDate(value) {
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

export default function CustomerLedgerPanel() {
  const [selectedMumin, setSelectedMumin] = useState(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledger, setLedger] = useState([]);
  const [ledgerMeta, setLedgerMeta] = useState({ totalCount: 0, totalPages: 1 });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedMumin?.muminId) return;
    loadLedger(selectedMumin.muminId, ledgerPage);
  }, [selectedMumin, ledgerPage]);

  async function loadLedger(muminId, pageNumber) {
    try {
      setLedgerLoading(true);
      setError("");
      const result = await accountsApi.getMuminLedger(
        muminId,
        pageNumber,
        PAGE_SIZE
      );
      setLedger(Array.isArray(result?.items) ? result.items : []);
      setLedgerMeta({
        totalCount: Number(result?.totalCount || 0),
        totalPages: Math.max(1, Number(result?.totalPages || 1))
      });
    } catch (requestError) {
      setLedger([]);
      setError(requestError.message || "Unable to load the customer ledger.");
    } finally {
      setLedgerLoading(false);
    }
  }

  function selectMumin(item) {
    setSelectedMumin(item);
    setLedgerPage(1);
  }

  function clearSelection() {
    setSelectedMumin(null);
    setLedger([]);
    setLedgerMeta({ totalCount: 0, totalPages: 1 });
    setLedgerPage(1);
  }

  return (
    <View>
      <MumineenSearchList
        selectedItem={selectedMumin}
        onSelect={selectMumin}
        onClear={clearSelection}
        hint="Select a Mumin to load their payment ledger from the Accounts API."
        selectActionLabel="View ledger ›"
      />

      {selectedMumin ? (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.sectionTitle}>
            Payment ledger ({ledgerMeta.totalCount})
          </Text>

          {ledgerLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : ledger.length ? (
            ledger.map(item => (
              <Card key={String(item.paymentId)}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.title}>
                      {item.categoryName || "Payment"}
                      {item.subCategoryName ? ` · ${item.subCategoryName}` : ""}
                    </Text>
                    <Text style={styles.meta}>
                      {formatDate(item.updatedAt || item.createdAt)} · {item.paymentMethodName || "-"}
                    </Text>
                    <Text style={styles.meta}>
                      Status: {item.status || "-"}
                      {item.paymentReference ? ` · Ref ${item.paymentReference}` : ""}
                    </Text>
                    {item.remarks ? <Text style={styles.meta}>{item.remarks}</Text> : null}
                    {Array.isArray(item.fieldValues) && item.fieldValues.length ? (
                      <View style={styles.fields}>
                        {item.fieldValues.map(field => (
                          <Text key={`${item.paymentId}-${field.fieldId}`} style={styles.fieldText}>
                            {field.fieldName || `Field ${field.fieldId}`}: {field.value || "-"}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.amount}>{money(item.amount)}</Text>
                </View>
              </Card>
            ))
          ) : (
            <Card><Text style={styles.empty}>No payments found for this Mumin.</Text></Card>
          )}

          <View style={styles.pagination}>
            <Button
              title="Previous"
              compact
              variant="outline"
              disabled={ledgerPage <= 1 || ledgerLoading}
              onPress={() => setLedgerPage(page => Math.max(1, page - 1))}
            />
            <Text style={styles.pageText}>
              Page {ledgerPage} of {ledgerMeta.totalPages}
            </Text>
            <Button
              title="Next"
              compact
              variant="outline"
              disabled={ledgerPage >= ledgerMeta.totalPages || ledgerLoading}
              onPress={() => setLedgerPage(page => page + 1)}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  amount: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.sm },
  fields: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  fieldText: { color: colors.textSoft, marginTop: 3, fontSize: 12 },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginVertical: spacing.md },
  pageText: { color: colors.muted, fontSize: 12, fontWeight: "700" }
});
