import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import Screen from "../../src/components/Screen";
import { colors, spacing } from "../../src/theme";

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setUsers(await apiRequest(endpoints.users));
    } catch (e) {
      setError(e.message);
    }
  }

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;

    return users.filter(user =>
      [
        user.name,
        user.firstName,
        user.middleName,
        user.lastName,
        user.itsId,
        user.phoneNumber
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalized))
    );
  }, [query, users]);

  return (
    <Screen>
      <Text style={styles.title}>Jamaat users</Text>
      <Text style={styles.subtitle}>
        Search users by full name, surname, ITS ID, or phone number.
        This list is read-only.
      </Text>

      <Input
        label="Search users"
        value={query}
        onChangeText={setQuery}
        placeholder="Name, surname, ITS ID or phone"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.resultCount}>
        {filteredUsers.length} users
      </Text>

      {filteredUsers.map(user => (
        <Pressable
          key={user.id}
          onPress={() =>
            router.push({
              pathname: "/(app)/user-detail",
              params: { userId: user.id }
            })
          }
        >
          <Card style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.firstName?.[0] || "U"}
                {user.lastName?.[0] || ""}
              </Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.meta}>
                ITS {user.itsId} · Grade {user.grade || "-"}
              </Text>
              <Text style={styles.meta}>
                {user.phoneNumber || "No phone number"}
              </Text>
              <Text style={styles.status}>
                {user.takesFmb ? "Taking FMB thali" : "Not taking FMB thali"}
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.lg
  },
  resultCount: {
    color: colors.muted,
    marginBottom: spacing.sm
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  content: {
    flex: 1
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  meta: {
    color: colors.muted,
    marginTop: 3
  },
  status: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 5
  },
  chevron: {
    color: colors.muted,
    fontSize: 34
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  }
});
