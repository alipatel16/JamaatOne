import React, { useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { jamaatApi } from "../../src/api/jamaatApi";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radius, spacing } from "../../src/theme";

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 390;
  const { user, logout } = useAuth();
  const [jamaatName, setJamaatName] = useState("");

  useEffect(() => {
    let active = true;

    async function loadJamaatName() {
      const jamaatId = user?.jamaatId;
      if (!jamaatId) {
        if (active) setJamaatName("");
        return;
      }

      try {
        const jamaat = await jamaatApi.getById(jamaatId);
        if (active) setJamaatName(jamaat?.name || "");
      } catch {
        if (active) setJamaatName("");
      }
    }

    loadJamaatName();
    return () => {
      active = false;
    };
  }, [user?.jamaatId]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initial = (user?.name || "J").slice(0, 1).toUpperCase();

  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your JamaatOne identity and access details.</Text>
      </View>

      <Card style={[styles.profileCard, phone && styles.profileCardPhone]}>
        <View style={[styles.profileTop, narrow && styles.profileTopNarrow]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={[styles.profileCopy, narrow && styles.profileCopyNarrow]}>
            <Text style={styles.name}>{user?.name || "Member"}</Text>
            <Text style={styles.role}>{user?.role || "Member"}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={[styles.infoItem, phone && styles.infoItemPhone]}>
            <Text style={styles.infoLabel}>ITS ID</Text>
            <Text style={styles.infoValue}>{user?.itsId || "-"}</Text>
          </View>
          {/* <View style={[styles.infoItem, phone && styles.infoItemPhone]}>
            <Text style={styles.infoLabel}>Jamaat</Text>
            <Text style={styles.infoValue}>{jamaatName || "-"}</Text>
          </View> */}
          <View style={[styles.infoItem, phone && styles.infoItemPhone]}>
            <Text style={styles.infoLabel}>Access</Text>
            <Text style={styles.infoValue}>{user?.roleName || user?.role || "Member"}</Text>
          </View>
        </View>
      </Card>

      <Card style={[styles.actionCard, phone && styles.actionCardPhone]} elevated={false}>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Sign out of JamaatOne</Text>
          <Text style={styles.actionText}>End this session on the current device.</Text>
        </View>
        <Button title="Sign out" variant="danger" onPress={handleLogout} style={[styles.signOutButton, phone && styles.signOutButtonPhone]} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.lg },
  eyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { fontSize: 30, fontWeight: "900", color: colors.text, marginTop: 4 },
  subtitle: { color: colors.muted, marginTop: 5 },
  profileCard: { padding: spacing.xl },
  profileCardPhone: { padding: spacing.lg },
  profileTop: { flexDirection: "row", alignItems: "center" },
  profileTopNarrow: { flexDirection: "column", alignItems: "flex-start" },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  profileCopy: { flex: 1, marginLeft: spacing.md },
  profileCopyNarrow: { marginLeft: 0, marginTop: spacing.md },
  name: { fontSize: 23, fontWeight: "900", color: colors.text },
  role: { color: colors.primaryStrong, fontWeight: "800", marginTop: 4 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl },
  infoItem: { flex: 1, minWidth: 160, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.backgroundAlt },
  infoItemPhone: { minWidth: "100%", width: "100%" },
  infoLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  infoValue: { color: colors.text, fontWeight: "900", marginTop: 6, fontSize: 15 },
  actionCard: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  actionCardPhone: { alignItems: "stretch" },
  actionCopy: { flex: 1, minWidth: 220 },
  actionTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  actionText: { color: colors.muted, fontSize: 12, marginTop: 4 },
  signOutButton: { minWidth: 120 },
  signOutButtonPhone: { width: "100%" }
});
