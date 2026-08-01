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
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import { receiptHtml } from "../../src/utils/receiptHtml";
import {
  downloadReceiptPdf,
  printReceiptPdf
} from "../../src/utils/receiptWeb";
import { colors, radius, spacing, typography } from "../../src/theme";

export default function Receipt() {
  const { paymentId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId) return;
    accountsApi
      .getReceipt(paymentId)
      .then(setReceipt)
      .catch(result => setError(result.message));
  }, [paymentId]);

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
          dialogTitle: "Download or share receipt"
        });
      } else {
        Alert.alert("PDF created", uri);
      }
    } catch (result) {
      Alert.alert("PDF failed", result.message);
    }
  }

  return (
    <Screen>
      <View style={[styles.pageHeader, isWide && styles.pageHeaderWide]}>
        <View>
          <Text style={styles.eyebrow}>OFFICIAL RECEIPT</Text>
          <Text style={styles.pageTitle}>Payment receipt</Text>
          <Text style={styles.pageSubtitle}>
            Print, download, or share this payment acknowledgement.
          </Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              title="Print"
              variant="outline"
              onPress={printReceipt}
            />
          </View>
          <View style={styles.action}>
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
          <View style={styles.receiptTop}>
            <View style={styles.brandBlock}>
              <Text style={styles.brandKicker}>JAMAATONE</Text>
              <Text style={styles.brand}>
                {receipt.jamaatName || "Dawoodi Bohra Jamat Viramgam"}
              </Text>
              <Text style={styles.muted}>{receipt.jamaatAddress}</Text>
            </View>

            <View style={styles.receiptNumberBox}>
              <Text style={styles.small}>RECEIPT NUMBER</Text>
              <Text style={styles.receiptNumber}>
                {receipt.receiptNumber}
              </Text>
              <Text style={styles.receiptDate}>{receipt.paymentDate}</Text>
            </View>
          </View>

          <View style={styles.amountPanel}>
            <View>
              <Text style={styles.small}>AMOUNT RECEIVED</Text>
              <Text style={styles.category}>{receipt.paymentFor}</Text>
            </View>
            <View style={styles.amountRight}>
              <Text style={styles.amount}>
                ₹{Number(receipt.amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
              <Text style={styles.muted}>{receipt.amountInWords}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>MEMBER DETAILS</Text>
          <View style={styles.detailGrid}>
            <Row label="Paid by" value={receipt.userName} />
            <Row
              label="ITS ID / Grade"
              value={`${receipt.itsId || "-"} / ${receipt.userGrade || "-"}`}
            />
            {receipt.paidForUserName ? (
              <Row
                label="Madrasa fee paid for"
                value={`${receipt.paidForUserName}${
                  receipt.paidForItsId
                    ? ` · ITS ${receipt.paidForItsId}`
                    : ""
                }`}
              />
            ) : null}
          </View>

          <Text style={styles.sectionLabel}>PAYMENT DETAILS</Text>
          <View style={styles.detailGrid}>
            <Row
              label="Payment for"
              value={
                receipt.otherDescription ||
                receipt.subType ||
                receipt.lagatType ||
                receipt.paymentFor
              }
            />
            <Row
              label="Payment method"
              value={`${receipt.paymentMethod || "-"}${
                receipt.referenceNumber
                  ? ` · ${receipt.referenceNumber}`
                  : ""
              }`}
            />
            <Row label="Notes" value={receipt.notes || "-"} />
          </View>

          <View style={styles.recorderCard}>
            <View>
              <Text style={styles.small}>PAYMENT RECORDED BY</Text>
              <Text style={styles.recorderName}>
                {receipt.recordedByName || receipt.createdByName || "-"}
              </Text>
            </View>
            <View style={styles.amountRight}>
              <Text style={styles.small}>ITS ID</Text>
              <Text style={styles.recorderName}>
                {receipt.recordedByItsId || receipt.createdByItsId || "-"}
              </Text>
            </View>
          </View>

          <View style={styles.signature}>
            <Text style={styles.signatureText}>Authorised Signature</Text>
          </View>

          <Text style={styles.footerNote}>
            Computer-generated receipt · Generated by JamaatOne
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "-"}</Text>
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
  receiptCard: {
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
    padding: 0,
    overflow: "hidden"
  },
  receiptTop: {
    padding: spacing.xl,
    backgroundColor: colors.primaryStrong,
    flexDirection: "row",
    justifyContent: "space-between"
  },
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
  rowLabel: {
    width: "36%",
    backgroundColor: colors.surfaceMuted,
    color: colors.muted,
    padding: spacing.md,
    fontSize: 12,
    fontWeight: "600"
  },
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
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  }
});
