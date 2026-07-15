import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import { receiptHtml } from "../../src/utils/receiptHtml";
import { colors, spacing } from "../../src/theme";
export default function Receipt() {
  const { paymentId } = useLocalSearchParams(),
    [r, setR] = useState(null),
    [e, setE] = useState("");
  useEffect(() => {
    paymentId &&
      apiRequest(endpoints.paymentReceipt(paymentId))
        .then(setR)
        .catch((x) => setE(x.message));
  }, [paymentId]);
  if (!r && !e) return <LoadingView />;
  const print = async () => {
    try {
      await Print.printAsync({ html: receiptHtml(r) });
    } catch (x) {
      Alert.alert("Print failed", x.message);
    }
  };
  const pdf = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: receiptHtml(r) });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save or share receipt",
        });
      else Alert.alert("PDF created", uri);
    } catch (x) {
      Alert.alert("PDF failed", x.message);
    }
  };
  return (
    <Screen>
      {e ? <Text style={s.err}>{e}</Text> : null}
      {r ? (
        <>
          <Card style={s.card}>
            <View style={s.top}>
              <View>
                <Text style={s.brand}>{r.jamaatName}</Text>
                <Text style={s.muted}>{r.jamaatAddress}</Text>
              </View>
              <View>
                <Text style={s.small}>PAYMENT RECEIPT</Text>
                <Text style={s.no}>{r.receiptNumber}</Text>
              </View>
            </View>
            <View style={s.line} />
            <Row l="Member" v={r.userName} />
            <Row l="ITS ID / Grade" v={`${r.itsId} / ${r.userGrade || "-"}`} />
            <Row
              l="Payment for"
              v={`${r.paymentFor}${r.lagatType ? " · " + r.lagatType.replaceAll("_", " ") : ""}`}
            />
            <Row
              l="Payment method"
              v={`${r.paymentMethod}${r.referenceNumber ? " · " + r.referenceNumber : ""}`}
            />
            <View style={s.amount}>
              <Text style={s.amountLabel}>AMOUNT RECEIVED</Text>
              <Text style={s.amountText}>
                ₹{Number(r.amount).toLocaleString("en-IN")}
              </Text>
              <Text>{r.amountInWords}</Text>
            </View>
            <Row l="Notes" v={r.notes || "-"} />
            <View style={s.footer}>
              <Text>
                Entered by
                {r.createdByName}
              </Text>
              <Text style={s.sign}>Authorised Signature</Text>
            </View>
          </Card>
          <View style={s.actions}>
            <View style={s.action}>
              <Button title="Print receipt" onPress={print} />
            </View>
            <View style={s.action}>
              <Button title="Download / Share PDF" onPress={pdf} />
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
const Row = ({ l, v }) => (
  <View style={s.row}>
    <Text style={s.label}>{l}</Text>
    <Text style={s.value}>{v}</Text>
  </View>
);
const s = StyleSheet.create({
  card: { maxWidth: 780, width: "100%", alignSelf: "center", padding: 24 },
  top: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 25, fontWeight: "900", color: colors.primary },
  muted: { color: colors.muted },
  small: { fontSize: 11, color: colors.muted, textAlign: "right" },
  no: { fontSize: 18, fontWeight: "900" },
  line: { height: 3, backgroundColor: colors.primary, marginVertical: 20 },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { width: "35%", color: colors.muted },
  value: { flex: 1, fontWeight: "700", color: colors.text },
  amount: {
    backgroundColor: "#eef5f3",
    padding: 18,
    borderRadius: 12,
    marginVertical: 20,
  },
  amountLabel: { fontSize: 11, color: colors.muted },
  amountText: { fontSize: 28, fontWeight: "900", color: colors.primary },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 55,
  },
  sign: { borderTopWidth: 1, paddingTop: 8 },
  actions: {
    flexDirection: "row",
    maxWidth: 780,
    width: "100%",
    alignSelf: "center",
    marginHorizontal: -4,
  },
  action: { flex: 1, margin: 4 },
  err: { color: colors.danger },
});
