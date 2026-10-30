import React, { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { authApi } from "../src/api/authApi";
import { passwordChangePayload } from "../src/utils/passwordChange";
import Button from "../src/components/Button";
import Card from "../src/components/Card";
import Input from "../src/components/Input";
import Screen from "../src/components/Screen";
import { colors, radius, spacing, typography } from "../src/theme";

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const [form, setForm] = useState({ itsNo: "", oldPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  function update(field, value) {
    setError("");
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit() {
    if (inFlight.current) return;
    let payload;
    try { payload = passwordChangePayload(form); }
    catch (error) { setError(error.message); return; }
    inFlight.current = true;
    setLoading(true); setError("");
    try {
      await authApi.changePassword(payload);
      setForm({ itsNo: "", oldPassword: "", newPassword: "", confirmPassword: "" });
      router.replace({ pathname: "/login", params: { passwordChanged: "1" } });
    } catch (error) {
      setError(error.message || "Unable to change your password. Please try again.");
    } finally { inFlight.current = false; setLoading(false); }
  }

  return (
    <Screen contentStyle={styles.page}>
      <Card style={[styles.card, width < 600 && styles.cardPhone]}>
        <View style={styles.topMark} />
        <Image source={require("../assets/favicon.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="JamaatOne logo" />
        <Text style={styles.kicker}>ACCOUNT ACCESS</Text>
        <Text style={styles.title}>Change your password</Text>
        <Text style={styles.body}>Enter your ITS number and current password to set a new password.</Text>
        <View style={styles.form}>
          <Input label="ITS number" value={form.itsNo} onChangeText={value => update("itsNo", value)} keyboardType="number-pad" maxLength={8} autoCapitalize="none" autoComplete="username" placeholder="Enter 8-digit ITS number" editable={!loading} />
          <Input label="Current password" value={form.oldPassword} onChangeText={value => update("oldPassword", value)} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" placeholder="Enter current password" editable={!loading} />
          <Input label="New password" value={form.newPassword} onChangeText={value => update("newPassword", value)} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" placeholder="At least 8 characters" editable={!loading} />
          <Input label="Confirm new password" value={form.confirmPassword} onChangeText={value => update("confirmPassword", value)} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" placeholder="Re-enter new password" editable={!loading} onSubmitEditing={submit} />
          {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View> : null}
          <Button title="Change password" loading={loading} onPress={submit} />
        </View>
        <View style={styles.helpBox}>
          <MaterialCommunityIcons name="information-outline" size={19} color={colors.primaryStrong} />
          <Text style={styles.helpText}>Forgot your current password? Contact your Aamil for help accessing your account.</Text>
        </View>
        <Pressable accessibilityRole="link" disabled={loading} onPress={() => router.replace("/login")} style={styles.backLink}>
          <Text style={styles.backText}>Back to sign in</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { justifyContent: "center", paddingVertical: spacing.xl },
  card: { width: "100%", maxWidth: 480, alignSelf: "center", borderRadius: radius.xl, padding: spacing.xl, overflow: "hidden" },
  cardPhone: { padding: spacing.lg },
  topMark: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: colors.primaryStrong },
  logo: { width: 52, height: 52, marginBottom: spacing.md },
  kicker: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: typography.family, fontSize: 27, fontWeight: "900", marginTop: spacing.xs },
  body: { color: colors.muted, lineHeight: 21, marginTop: spacing.sm },
  form: { marginTop: spacing.lg },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 13, fontWeight: "700" },
  helpBox: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.surfaceTint, borderRadius: radius.md, marginTop: spacing.md },
  helpText: { flex: 1, color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  backLink: { alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: spacing.sm },
  backText: { color: colors.primaryStrong, fontWeight: "800", fontSize: 13 }
});
