import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { accountsApi } from "../../src/api/accountsApi";
import { mumineenApi } from "../../src/api/mumineenApi";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import { canManageAccounts } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { receiptHtml } from "../../src/utils/receiptHtml";
import {
  downloadReceiptPdf,
  printReceiptPdf
} from "../../src/utils/receiptWeb";
import { colors, radius, spacing, typography } from "../../src/theme";

function formatReceiptDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function isDebitEntry(value) {
  return String(value || "").trim().toUpperCase() === "DEBIT";
}

function amountInWords(value) {
  return `Rupees ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} only`;
}

function findPaidForMember(fieldValues = []) {
  return fieldValues.find(field =>
    /(member|mumin|child|student|paid.?for)/i.test(String(field?.fieldName || ""))
  );
}

function makeLiveReceipt(payment, mumin) {
  const paidFor = findPaidForMember(payment?.fieldValues || []);
  const category = [payment?.categoryName, payment?.subCategoryName]
    .filter(Boolean)
    .join(" · ");
  const paymentLines = Array.isArray(payment?.lines)
    ? payment.lines.map(line => ({
        paymentMethodId: line?.paymentMethodId,
        paymentMethodName: line?.paymentMethodName || `Method ${line?.paymentMethodId || "-"}`,
        amount: Number(line?.amount || 0),
        paymentReference: line?.paymentReference || ""
      }))
    : [];
  const paymentMethod = paymentLines.length
    ? paymentLines
        .map(line =>
          `${line.paymentMethodName} · INR ${Number(line.amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}${line.paymentReference ? ` · ${line.paymentReference}` : ""}`
        )
        .join(" | ")
    : payment?.paymentMethodName || "-";
  const amount = Number(payment?.totalAmount ?? payment?.amount ?? 0);

  return {
    documentType: "RECEIPT",
    isDayBook: false,
    jamaatName: payment?.jamaatName || "JamaatOne",
    jamaatAddress: "",
    receiptNumber: payment?.receiptNo || "-",
    paymentDate: formatReceiptDate(payment?.transactionDate || payment?.createdAt),
    paymentFor: category || "Payment",
    amount,
    amountInWords: amountInWords(amount),
    userName: payment?.muminName || mumin?.fullName || mumin?.firstName || "-",
    itsId: mumin?.itsId || "-",
    userGrade: mumin?.category || "-",
    paidForUserName: paidFor?.value || "",
    paidForItsId: "",
    paymentMethod,
    paymentLines,
    bankAccountName: payment?.bankAccountName || "-",
    referenceNumber: paymentLines.length ? "" : payment?.paymentReference || "",
    notes: payment?.remarks || "",
    recordedByName: payment?.updatedByName || payment?.createdByName || "-",
    recordedByItsId:
      payment?.updatedByItsNo ||
      payment?.createdByItsNo ||
      payment?.createdByItsId ||
      "-",
    createdByName: payment?.createdByName || "",
    createdByItsNo: payment?.createdByItsNo || payment?.createdByItsId || "",
    fieldValues: payment?.fieldValues || []
  };
}

function makeDayBookDocument(entry) {
  const voucher = isDebitEntry(entry?.entryType);
  const category = [entry?.categoryName, entry?.subCategoryName]
    .filter(Boolean)
    .join(" · ");

  return {
    documentType: voucher ? "VOUCHER" : "RECEIPT",
    isDayBook: true,
    entryType: entry?.entryType || (voucher ? "DEBIT" : "CREDIT"),
    jamaatName: entry?.jamaatName || "JamaatOne",
    jamaatAddress: "",
    receiptNumber: voucher ? entry?.voucherNo || "-" : entry?.receiptNo || "-",
    paymentDate: formatReceiptDate(entry?.transactionDate || entry?.createdAt),
    paymentFor: category || "Day Book entry",
    amount: Number(entry?.amount || 0),
    amountInWords: amountInWords(entry?.amount),
    paymentMethod: entry?.paymentMethodName || "-",
    bankAccountName: entry?.bankAccountName || "-",
    referenceNumber: entry?.paymentReferenceNo || "",
    notes: entry?.remarks || "",
    recordedByName: entry?.updatedByName || entry?.createdByName || "-",
    recordedByItsId: entry?.updatedByItsNo || entry?.createdByItsNo || "-",
    createdByName: entry?.createdByName || "",
    createdByItsNo: entry?.createdByItsNo || "",
    fieldValues: entry?.fieldValues || []
  };
}

export default function Receipt() {
  const { user } = useAuth();
  const manager = canManageAccounts(user);
  const { paymentId, receiptId, dayBookId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const phone = width < 600;
  const narrow = width < 380;
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId && !receiptId && !dayBookId) return;

    let active = true;
    (async () => {
      try {
        setError("");
        setReceipt(null);

        if (dayBookId) {
          if (!manager) {
            throw new Error("This Day Book document is only available to account managers.");
          }
          const entry = await accountsApi.getDaybookEntry(dayBookId);
          if (active) setReceipt(makeDayBookDocument(entry));
          return;
        }

        const payment = receiptId
          ? await accountsApi.getReceiptById(receiptId)
          : await accountsApi.getPayment(paymentId);

        if (!manager) {
          const itsNo = String(user?.itsNo || user?.itsId || "").trim();
          if (!itsNo) throw new Error("This receipt is not available for the current account.");
          const result = await mumineenApi.getPaged(1, 20, itsNo);
          const mumineen = Array.isArray(result?.items) ? result.items : [];
          const ownMumin = mumineen.find(item => String(item?.itsId || "").trim() === itsNo);
          if (!ownMumin?.muminId || String(ownMumin.muminId) !== String(payment?.muminId)) {
            throw new Error("You can only open receipts from your own payment history.");
          }
        }

        let mumin = null;
        if (payment?.muminId) {
          try {
            mumin = await mumineenApi.getById(payment.muminId);
          } catch {
            // Payment details remain printable even if member enrichment fails.
          }
        }
        if (active) setReceipt(makeLiveReceipt(payment, mumin));
      } catch (result) {
        if (active) {
          setError(
            result.message ||
              (dayBookId ? "Unable to load Day Book document." : "Unable to load payment receipt.")
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [dayBookId, paymentId, receiptId, manager, user?.itsNo, user?.itsId]);

  if (!receipt && !error) return <LoadingView />;

  async function printReceipt() {
    try {
      if (Platform.OS === "web") {
        printReceiptPdf(receipt);
        return;
      }

      await Print.printAsync({ html: receiptHtml(receipt) });
    } catch (result) {
      Alert.alert("Print failed", result.message);
    }
  }

  async function downloadPdf() {
    try {
      if (Platform.OS === "web") {
        downloadReceiptPdf(receipt);
        return;
      }

      const { uri } = await Print.printToFileAsync({
        html: receiptHtml(receipt)
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Download or share ${String(receipt?.documentType || "receipt").toLowerCase()}`
        });
      } else {
        Alert.alert("PDF created", uri);
      }
    } catch (result) {
      Alert.alert("PDF failed", result.message);
    }
  }

  const documentType = String(receipt?.documentType || "RECEIPT").toUpperCase();
  const isVoucher = documentType === "VOUCHER";
  const documentTitle = isVoucher ? "Payment voucher" : "Payment receipt";

  return (
    <Screen>
      <View style={[styles.pageHeader, isWide && styles.pageHeaderWide]}>
        <View>
          <Text style={styles.eyebrow}>OFFICIAL {documentType}</Text>
          <Text style={styles.pageTitle}>{documentTitle}</Text>
          <Text style={styles.pageSubtitle}>
            {isVoucher
              ? "Print, download, or share this payment voucher."
              : "Print, download, or share this payment acknowledgement."}
          </Text>
        </View>

        <View style={[styles.actions, phone && styles.actionsPhone]}>
          <View style={[styles.action, phone && styles.actionPhone]}>
            <Button
              title="Print"
              variant="outline"
              onPress={printReceipt}
            />
          </View>
          <View style={[styles.action, phone && styles.actionPhone]}>
            <Button
              title="Download PDF"
              onPress={downloadPdf}
            />
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {receipt ? (
        <Card style={styles.receiptCard}>
          <View style={[styles.receiptTop, phone && styles.receiptTopPhone]}>
            <View style={styles.brandBlock}>
              <Text style={styles.brandKicker}>JAMAATONE</Text>
              <Text style={styles.brand}>
                {"Dawoodi Bohra Jamaat"}
              </Text>
              <Text style={styles.muted}>{receipt.jamaatName}</Text>
            </View>

            <View style={[styles.receiptNumberBox, phone && styles.receiptNumberBoxPhone]}>
              <Text style={styles.small}>{documentType} NUMBER</Text>
              <Text style={styles.receiptNumber}>
                {receipt.receiptNumber}
              </Text>
              <Text style={styles.receiptDate}>{receipt.paymentDate}</Text>
            </View>
          </View>

          <View style={[styles.amountPanel, phone && styles.amountPanelPhone]}>
            <View>
              <Text style={styles.small}>{isVoucher ? "AMOUNT PAID" : "AMOUNT RECEIVED"}</Text>
              <Text style={styles.category}>{receipt.paymentFor}</Text>
            </View>
            <View style={[styles.amountRight, phone && styles.amountRightPhone]}>
              <Text style={styles.amount}>
                ₹{Number(receipt.amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
              <Text style={styles.muted}>{receipt.amountInWords}</Text>
            </View>
          </View>

          {receipt.isDayBook ? (
            <>
              <Text style={[styles.sectionLabel, phone && styles.sectionLabelPhone]}>DAY BOOK DETAILS</Text>
              <View style={[styles.detailGrid, phone && styles.detailGridPhone]}>
                <Row compact={phone} label="Entry type" value={receipt.entryType || "-"} />
                <Row compact={phone} label="Category" value={receipt.paymentFor || "-"} />
                <Row compact={phone} label="Payment method" value={receipt.paymentMethod || "-"} />
                <Row compact={phone} label="Bank account" value={receipt.bankAccountName || "-"} />
                <Row compact={phone} label="Reference" value={receipt.referenceNumber || "-"} />
                <Row compact={phone} label="Notes" value={receipt.notes || "-"} />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.sectionLabel, phone && styles.sectionLabelPhone]}>MEMBER DETAILS</Text>
              <View style={[styles.detailGrid, phone && styles.detailGridPhone]}>
                <Row compact={phone} label="Paid by" value={receipt.userName} />
                <Row
                  compact={phone}
                  label="ITS ID / Grade"
                  value={`${receipt.itsId || "-"} / ${receipt.userGrade || "-"}`}
                />
                {receipt.paidForUserName ? (
                  <Row
                    compact={phone}
                    label="Madrasa fee paid for"
                    value={`${receipt.paidForUserName}${
                      receipt.paidForItsId
                        ? ` · ITS ${receipt.paidForItsId}`
                        : ""
                    }`}
                  />
                ) : null}
              </View>

              <Text style={[styles.sectionLabel, phone && styles.sectionLabelPhone]}>PAYMENT DETAILS</Text>
              <View style={[styles.detailGrid, phone && styles.detailGridPhone]}>
                <Row
                  compact={phone}
                  label="Payment for"
                  value={
                    receipt.otherDescription ||
                    receipt.subType ||
                    receipt.lagatType ||
                    receipt.paymentFor
                  }
                />
                {Array.isArray(receipt.paymentLines) && receipt.paymentLines.length ? (
                  receipt.paymentLines.map((line, index) => (
                    <Row
                      key={`${line.paymentMethodId || line.paymentMethodName}-${index}`}
                      compact={phone}
                      label={`Payment method ${index + 1}`}
                      value={`${line.paymentMethodName || "-"} · ₹${Number(line.amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}${line.paymentReference ? ` · ${line.paymentReference}` : ""}`}
                    />
                  ))
                ) : (
                  <Row
                    compact={phone}
                    label="Payment method"
                    value={`${receipt.paymentMethod || "-"}${
                      receipt.referenceNumber
                        ? ` · ${receipt.referenceNumber}`
                        : ""
                    }`}
                  />
                )}
                <Row compact={phone} label="Notes" value={receipt.notes || "-"} />
              </View>
            </>
          )}

          <View style={[styles.recorderCard, phone && styles.recorderCardPhone]}>
            <View>
              <Text style={styles.small}>{receipt.isDayBook ? "ENTRY RECORDED BY" : "PAYMENT RECORDED BY"}</Text>
              <Text style={styles.recorderName}>
                {receipt.recordedByName || receipt.createdByName || "-"}
              </Text>
            </View>
            <View style={[styles.amountRight, phone && styles.amountRightPhone]}>
              <Text style={styles.small}>ITS ID</Text>
              <Text style={styles.recorderName}>
                {receipt.recordedByItsId || receipt.createdByItsNo || "-"}
              </Text>
            </View>
          </View>

          <View style={[styles.signature, phone && styles.signaturePhone]}>
            <Text style={styles.signatureText}>Authorised Signature</Text>
          </View>

          <Text style={[styles.footerNote, phone && styles.footerNotePhone]}>
            Computer-generated {documentType.toLowerCase()} · Generated by JamaatOne
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, compact = false }) {
  return (
    <View style={[styles.row, compact && styles.rowPhone]}>
      <Text style={[styles.rowLabel, compact && styles.rowLabelPhone]}>{label}</Text>
      <Text style={[styles.rowValue, compact && styles.rowValuePhone]}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: spacing.lg
  },
  pageHeaderWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  amountPanelPhone: { margin: spacing.md, marginBottom: 0, padding: spacing.md, flexDirection: "column", alignItems: "flex-start", gap: spacing.md },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3
  },
  pageTitle: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 30,
    fontWeight: "700",
    marginTop: 4
  },
  pageSubtitle: {
    color: colors.muted,
    marginTop: 5
  },
  actions: {
    flexDirection: "row",
    marginHorizontal: -4,
    marginTop: spacing.md
  },
  action: {
    marginHorizontal: 4,
    minWidth: 130
  },
  actionsPhone: { width: "100%", marginHorizontal: 0, gap: spacing.sm },
  actionPhone: { flex: 1, minWidth: 0, marginHorizontal: 0 },
  receiptCard: {
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
    padding: 0,
    overflow: "hidden"
  },
  detailGridPhone: { marginHorizontal: spacing.md },
  receiptTop: {
    padding: spacing.xl,
    backgroundColor: colors.primaryStrong,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  recorderCardPhone: { margin: spacing.md, flexDirection: "column", gap: spacing.md },
  receiptTopPhone: { padding: spacing.lg, flexDirection: "column", gap: spacing.lg },
  brandBlock: {
    flex: 1,
    paddingRight: spacing.md
  },
  brandKicker: {
    color: "#E7D3AB",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.7
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "700",
    marginTop: 7
  },
  muted: {
    color: colors.muted,
    marginTop: 4
  },
  receiptNumberBox: {
    backgroundColor: "rgba(255,255,255,.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "flex-end"
  },
  receiptNumberBoxPhone: { alignItems: "flex-start", width: "100%" },
  small: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1
  },
  receiptNumber: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4
  },
  receiptDate: {
    color: "#E7D3AB",
    marginTop: 4,
    fontSize: 12
  },
  amountPanel: {
    margin: spacing.xl,
    marginBottom: 0,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  category: {
    color: colors.warning,
    marginTop: 5,
    fontWeight: "700"
  },
  amountRight: {
    alignItems: "flex-end"
  },
  amountRightPhone: { alignItems: "flex-start", width: "100%" },
  amount: {
    color: colors.primaryStrong,
    fontSize: 29,
    fontWeight: "700"
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.sm
  },
  sectionLabelPhone: { marginHorizontal: spacing.md, marginTop: spacing.lg },
  detailGrid: {
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden"
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  rowPhone: { flexDirection: "column" },
  rowLabel: {
    width: "36%",
    backgroundColor: colors.surfaceMuted,
    color: colors.muted,
    padding: spacing.md,
    fontSize: 12,
    fontWeight: "600"
  },
  rowValuePhone: { width: "100%", paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rowLabelPhone: { width: "100%", paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rowValue: {
    flex: 1,
    color: colors.text,
    padding: spacing.md,
    fontSize: 12,
    fontWeight: "600"
  },
  recorderCard: {
    margin: spacing.xl,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  recorderName: {
    color: colors.text,
    fontWeight: "700",
    marginTop: 4
  },
  signature: {
    width: 210,
    alignSelf: "flex-end",
    marginRight: spacing.xl,
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    alignItems: "center",
    paddingTop: spacing.sm
  },
  signaturePhone: { width: "55%", marginRight: spacing.md, marginTop: spacing.lg },
  signatureText: {
    color: colors.muted,
    fontSize: 11
  },
  footerNote: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
    padding: spacing.xl
  },
  footerNotePhone: { padding: spacing.lg },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  }
});
