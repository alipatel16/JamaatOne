import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { router } from "expo-router";

import Button from "../src/components/Button";
import Card from "../src/components/Card";
import Input from "../src/components/Input";
import Screen from "../src/components/Screen";
import { useAuth } from "../src/context/AuthContext";
import { isSuperAdmin } from "../src/constants/roles";
import {
  colors,
  radius,
  spacing,
  typography
} from "../src/theme";

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
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
      <View style={[styles.hero, isWide && styles.heroWide]}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>J</Text>
        </View>
        <Text style={styles.kicker}>JAMAATONE</Text>
        <Text style={styles.heroTitle}>
          Your Jamaat services, thoughtfully connected.
        </Text>
        <Text style={styles.heroBody}>
          Accounts, FMB, announcements, calendar, and community services
          in one calm and secure experience.
        </Text>

        <View style={styles.featureList}>
          {[
            "Role-based member access",
            "Receipts and account records",
            "FMB and family services"
          ].map(item => (
            <View key={item} style={styles.feature}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.loginCard}>
        <Text style={styles.formKicker}>WELCOME BACK</Text>
        <Text style={styles.formTitle}>Sign in with ITS</Text>
        <Text style={styles.formBody}>
          Enter your ITS credentials to continue to JamaatOne.
        </Text>

        <View style={styles.form}>
          <Input
            label="ITS ID"
            value={itsId}
            onChangeText={setItsId}
            keyboardType="number-pad"
            autoCapitalize="none"
            placeholder="Enter ITS ID"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Sign in"
            onPress={handleLogin}
            loading={loading}
          />
        </View>

        <Text style={styles.mockHint}>
          Sign-in uses the live JamaatOne API. Features without published APIs remain in demo mode.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    maxWidth: 1040,
    justifyContent: "center",
    paddingVertical: spacing.xl
  },
  pageWide: {
    flexDirection: "row",
    alignItems: "center"
  },
  hero: {
    padding: spacing.lg,
    marginBottom: spacing.lg
  },
  heroWide: {
    flex: 1,
    marginRight: spacing.xl,
    marginBottom: 0
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "700"
  },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginTop: spacing.lg
  },
  heroTitle: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "700",
    marginTop: spacing.sm
  },
  heroBody: {
    color: colors.textSoft,
    fontSize: 16,
    lineHeight: 25,
    marginTop: spacing.md
  },
  featureList: {
    marginTop: spacing.lg
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.sm
  },
  featureText: {
    color: colors.textSoft,
    fontWeight: "600"
  },
  loginCard: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    borderRadius: radius.xl,
    padding: spacing.xl
  },
  formKicker: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3
  },
  formTitle: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 27,
    fontWeight: "700",
    marginTop: spacing.xs
  },
  formBody: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  form: {
    marginTop: spacing.xl
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  },
  mockHint: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.md
  }
});
