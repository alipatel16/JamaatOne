import React from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing } from "../../src/theme";

function formatExpiry(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : String(value);
}

export default function ProfileScreen() {
  const { user, session, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Card>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>ITS ID: {user?.itsId}</Text>
        <Text style={styles.meta}>Role: {user?.role}</Text>
        <Text style={styles.meta}>Jamaat ID: {user?.jamaatId || "-"}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Session</Text>
        <Text style={styles.meta}>
          Access token validity: {session?.accessTokenExpiresInMinutes ?? "-"} minutes
        </Text>
        <Text style={styles.meta}>
          Access token expires: {formatExpiry(session?.accessTokenExpiresAt)}
        </Text>
        <Text style={styles.meta}>
          Refresh token validity: {session?.refreshTokenExpiresInDays ?? "-"} days
        </Text>
        <Text style={styles.meta}>
          Refresh token expires: {formatExpiry(session?.refreshTokenExpiresAt)}
        </Text>
      </Card>

      <Button title="Sign out" variant="danger" onPress={handleLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs
  },
  meta: { color: colors.muted, marginTop: spacing.xs }
});
