import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import Button from "../src/components/Button";
import Input from "../src/components/Input";
import Screen from "../src/components/Screen";
import { useAuth } from "../src/context/AuthContext";
import { colors, spacing } from "../src/theme";

export default function LoginScreen() {
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
      await login(itsId.trim(), password);
      router.replace("/(app)");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <Text style={styles.brand}>Jamaat FMB</Text>
      <Text style={styles.title}>Sign in with ITS</Text>
      <Text style={styles.subtitle}>
        Use your ITS ID credentials to continue.
      </Text>

      <Input
        label="ITS ID"
        value={itsId}
        onChangeText={setItsId}
        keyboardType="number-pad"
        autoCapitalize="none"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Sign in" onPress={handleLogin} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { maxWidth: 430, justifyContent: "center" },
  brand: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 30, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginVertical: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
