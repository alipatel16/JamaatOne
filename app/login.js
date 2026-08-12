import React, { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";

import Button from "../src/components/Button";
import Card from "../src/components/Card";
import Input from "../src/components/Input";
import Screen from "../src/components/Screen";
import { useAuth } from "../src/context/AuthContext";
import { isSuperAdmin } from "../src/constants/roles";
import { colors, radius, spacing, typography } from "../src/theme";

const FEATURES = [
  { icon: "₹", title: "Accounts", text: "Payments, receipts and ledgers" },
  { icon: "◷", title: "Namaaz", text: "Location-aware prayer timings" },
  { icon: "▦", title: "Calendar", text: "Hijri dates and community updates" }
];

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isPhone = width < 600;
  const isNarrow = width < 380;
  const { login } = useAuth();

  const [itsId, setItsId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!itsId.trim() || !password) {
      setError("ITS ID and password are required.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const signedInUser = await login(itsId.trim(), password);
      router.replace(isSuperAdmin(signedInUser) ? "/super-admin" : "/(app)");
    } catch (result) {
      setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen contentStyle={[styles.page, isWide && styles.pageWide]}>
      <View style={[styles.hero, isPhone && styles.heroPhone, isWide && styles.heroWide]}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoText}>J</Text></View>
          <View>
            <Text style={styles.kicker}>JAMAATONE</Text>
            <Text style={styles.brandCaption}>Community. Connected.</Text>
          </View>
        </View>

        <Text style={[styles.heroTitle, isPhone && styles.heroTitlePhone, isWide && styles.heroTitleWide]}>
          One beautiful place for your Jamaat essentials.
        </Text>
        <Text style={styles.heroBody}>
          A focused home for community services, accounts, FMB, announcements and everyday Jamaat access.
        </Text>

        <View style={[styles.featureGrid, isPhone && styles.featureGridPhone]}>
          {FEATURES.map(item => (
            <View key={item.title} style={[styles.featureCard, isPhone && styles.featureCardPhone, isNarrow && styles.featureCardNarrow]}>
              <View style={styles.featureIcon}><Text style={styles.featureIconText}>{item.icon}</Text></View>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <Card style={[styles.loginCard, isPhone && styles.loginCardPhone, isWide && styles.loginCardWide]}>
        <View style={styles.formTopMark} />
        <Text style={styles.formKicker}>WELCOME BACK</Text>
        <Text style={styles.formTitle}>Sign in to JamaatOne</Text>
        <Text style={styles.formBody}>Use your ITS credentials to continue.</Text>

        <View style={styles.form}>
          <Input
            label="ITS ID"
            value={itsId}
            onChangeText={setItsId}
            keyboardType="number-pad"
            autoCapitalize="none"
            placeholder="Enter ITS ID"
            autoComplete="username"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter password"
            autoComplete="current-password"
            onSubmitEditing={handleLogin}
          />
          {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View> : null}
          <Button title="Sign in" onPress={handleLogin} loading={loading} />
        </View>

        <View style={styles.secureRow}>
          <Text style={styles.secureIcon}>◇</Text>
          <Text style={styles.secureText}>Secure sign-in · session protected</Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { maxWidth: 1180, justifyContent: "center", paddingVertical: spacing.xl },
  pageWide: { flexDirection: "row", alignItems: "center", gap: spacing.xxxl },
  hero: { flex: 1, paddingVertical: spacing.lg },
  heroWide: { paddingHorizontal: spacing.lg },
  heroPhone: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFFFFF", fontSize: 29, fontWeight: "900" },
  kicker: { color: colors.accentStrong, fontSize: 11, fontWeight: "900", letterSpacing: 1.8 },
  brandCaption: { color: colors.muted, fontSize: 12, marginTop: 3, fontWeight: "700" },
  heroTitle: { color: colors.text, fontFamily: typography.family, fontSize: 35, lineHeight: 42, fontWeight: "900", marginTop: spacing.xl, maxWidth: 650 },
  heroTitleWide: { fontSize: 46, lineHeight: 54 },
  heroTitlePhone: { fontSize: 29, lineHeight: 36, marginTop: spacing.lg },
  heroBody: { color: colors.textSoft, fontSize: 16, lineHeight: 25, marginTop: spacing.md, maxWidth: 610 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl },
  featureGridPhone: { marginTop: spacing.lg },
  featureCard: { width: 160, minHeight: 136, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  featureCardPhone: { width: "48%", minHeight: 118 },
  featureCardNarrow: { width: "100%", minHeight: 104 },
  featureIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  featureIconText: { color: colors.primaryStrong, fontWeight: "900" },
  featureTitle: { color: colors.text, fontWeight: "900", marginTop: spacing.sm },
  featureText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  loginCard: { width: "100%", maxWidth: 450, alignSelf: "center", borderRadius: radius.xl, padding: spacing.xl, overflow: "hidden" },
  loginCardWide: { flexShrink: 0 },
  loginCardPhone: { padding: spacing.lg, borderRadius: 22 },
  formTopMark: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: colors.primaryStrong },
  formKicker: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  formTitle: { color: colors.text, fontFamily: typography.family, fontSize: 28, fontWeight: "900", marginTop: spacing.xs },
  formBody: { color: colors.muted, lineHeight: 21, marginTop: spacing.sm },
  form: { marginTop: spacing.xl },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 13, fontWeight: "700" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: spacing.lg },
  secureIcon: { color: colors.success, fontWeight: "900" },
  secureText: { color: colors.muted, fontSize: 11, fontWeight: "700" }
});
