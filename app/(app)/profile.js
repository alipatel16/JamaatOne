import React from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing } from "../../src/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

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
    marginBottom: spacing.md,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  meta: { color: colors.muted, marginTop: spacing.xs },
});
