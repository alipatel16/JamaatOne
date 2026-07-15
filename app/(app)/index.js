import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Card from "../../src/components/Card";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import { canManageJamaat } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing } from "../../src/theme";

export default function DashboardScreen() {
  const { user } = useAuth();
  const manager = canManageJamaat(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(endpoints.dashboard)
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (!data && !error) return <LoadingView />;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.greeting}>Salaam, {user?.firstName || user?.name}</Text>
          <Text style={styles.date}>{data?.gregorianDate}</Text>
          <Text style={styles.hijri}>{data?.hijriDate}</Text>
        </View>

        {manager ? (
          <Pressable
            style={styles.manageButton}
            onPress={() => router.push("/(app)/announcements")}
          >
            <Text style={styles.manageText}>Manage announcements</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable onPress={() => router.push("/(app)/namaz")}>
        <Card style={styles.featureCard}>
          <Text style={styles.featureTitle}>Namaaz timings</Text>
          <Text style={styles.featureText}>
            View detailed day timings based on your location.
          </Text>
        </Card>
      </Pressable>

      <Card>
        <Text style={styles.cardTitle}>Today’s FMB</Text>
        <Text style={styles.fmbStatus}>
          {data?.fmb?.status === "NO_FMB"
            ? "No FMB today"
            : data?.fmb?.status === "DELIVERED"
              ? "FMB delivered"
              : "FMB scheduled"}
        </Text>
        {data?.fmb?.menu ? (
          <Text style={styles.body}>{data.fmb.menu}</Text>
        ) : null}
      </Card>

      <Text style={styles.sectionTitle}>Announcements</Text>
      {data?.announcements?.map(item => (
        <Card key={item.id}>
          <Text style={styles.type}>{item.type}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          {item.location ? (
            <Text style={styles.location}>@ {item.location}</Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: spacing.lg
  },
  flex: {
    flex: 1
  },
  greeting: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800"
  },
  date: {
    color: colors.muted,
    marginTop: 4
  },
  hijri: {
    color: colors.accent,
    fontWeight: "700",
    marginTop: 3
  },
  manageButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginTop: spacing.sm
  },
  manageText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  featureCard: {
    backgroundColor: "#073653"
  },
  featureTitle: {
    color: "#D2AA00",
    fontSize: 19,
    fontWeight: "800"
  },
  featureText: {
    color: "#FFFFFF",
    marginTop: spacing.xs
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  fmbStatus: {
    color: colors.primary,
    fontWeight: "800",
    marginTop: spacing.sm
  },
  body: {
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  type: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3
  },
  location: {
    color: colors.muted,
    marginTop: spacing.sm
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  }
});
