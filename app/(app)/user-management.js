import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Redirect } from "expo-router";

import { usersApi } from "../../src/api/usersApi";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import { canManageUsers } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radius, spacing } from "../../src/theme";

const PAGE_SIZE = 20;
const EMPTY_FORM = { userId: null, itsNo: "", name: "", password: "", isActive: "true" };

const TYPES = {
  committee: {
    label: "Committee Members",
    singular: "Committee Member",
    caption: "Operational access across Jamaat modules without destructive delete actions.",
    list: filters => usersApi.getCommitteeMembers(filters),
    get: id => usersApi.getCommitteeMember(id),
    create: payload => usersApi.createCommitteeMember(payload),
    update: (id, payload) => usersApi.updateCommitteeMember(id, payload),
    remove: id => usersApi.deleteCommitteeMember(id)
  },
  fmb: {
    label: "FMB Users",
    singular: "FMB User",
    caption: "FMB management access with account access limited to personal payment history.",
    list: filters => usersApi.getFmbUsers(filters),
    get: id => usersApi.getFmbUser(id),
    create: payload => usersApi.createFmbUser(payload),
    update: (id, payload) => usersApi.updateFmbUser(id, payload),
    remove: id => usersApi.deleteFmbUser(id)
  },
  madarsa: {
    label: "Madrasa Admins",
    singular: "Madrasa Admin",
    caption: "Reserved for Madrasa Management. FMB management is intentionally unavailable.",
    list: filters => usersApi.getMadarsaAdmins(filters),
    get: id => usersApi.getMadarsaAdmin(id),
    create: payload => usersApi.createMadarsaAdmin(payload),
    update: (id, payload) => usersApi.updateMadarsaAdmin(id, payload),
    remove: id => usersApi.deleteMadarsaAdmin(id)
  }
};

async function confirmDelete(type, name) {
  const message = `Delete ${name || `this ${type}`}?`;
  if (Platform.OS === "web") {
    return globalThis.confirm?.(`Delete ${type}\n\n${message}`) ?? false;
  }
  return new Promise(resolve => {
    Alert.alert(`Delete ${type}`, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) }
    ]);
  });
}

export default function UserManagementScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 390;
  const [type, setType] = useState("committee");
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const config = TYPES[type];
  const statusOptions = useMemo(() => [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
  ], []);

  useEffect(() => {
    setForm(EMPTY_FORM);
    setSearch("");
    setPageNumber(1);
  }, [type]);

  useEffect(() => {
    if (!canManageUsers(user)) return;
    const timer = setTimeout(() => load(pageNumber), search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [type, pageNumber, search, user?.role]);

  if (!canManageUsers(user)) return <Redirect href="/(app)" />;

  async function load(page = 1) {
    try {
      setLoading(true);
      setError("");
      const result = await config.list({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
      setTotalCount(Number(result?.totalCount || 0));
    } catch (requestError) {
      setItems([]);
      setError(requestError.message || `Unable to load ${config.label.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError("");
  }

  async function edit(item) {
    try {
      setError("");
      const detail = await config.get(item.userId);
      const record = detail || item;
      setForm({
        userId: record.userId,
        itsNo: record.itsNo || "",
        name: record.name || "",
        password: "",
        isActive: String(record.isActive !== false)
      });
    } catch (requestError) {
      setError(requestError.message || `Unable to load ${config.singular} details.`);
    }
  }

  async function submit() {
    const editing = Boolean(form.userId);
    if (!editing && !form.itsNo.trim()) {
      setError("ITS number is required.");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!editing && !form.password) {
      setError("Temporary password is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editing) {
        await config.update(form.userId, {
          name: form.name,
          isActive: form.isActive === "true"
        });
      } else {
        await config.create({
          itsNo: form.itsNo,
          name: form.name,
          password: form.password
        });
      }
      resetForm();
      if (pageNumber === 1) await load(1);
      else setPageNumber(1);
    } catch (requestError) {
      setError(requestError.message || `Unable to ${editing ? "update" : "create"} ${config.singular}.`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!(await confirmDelete(config.singular, item.name))) return;
    try {
      setDeletingId(item.userId);
      setError("");
      await config.remove(item.userId);
      if (form.userId === item.userId) resetForm();
      await load(pageNumber);
    } catch (requestError) {
      setError(requestError.message || `Unable to delete ${config.singular}.`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>AAMIL ACCESS</Text>
        <Text style={[styles.pageTitle, phone && styles.pageTitlePhone]}>User Management</Text>
        <Text style={styles.pageSubtitle}>
          Create and maintain Jamaat operational users. Committee, FMB and Madrasa permissions remain separated by role.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsScroll}
      >
        {Object.entries(TYPES).map(([key, item]) => {
          const active = key === type;
          return (
            <Pressable
              key={key}
              onPress={() => setType(key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.roleIntro, phone && styles.roleIntroPhone]}>
        <View style={styles.roleIcon}>
          <Text style={styles.roleIconText}>{type === "committee" ? "C" : type === "fmb" ? "F" : "M"}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.roleTitle}>{config.label}</Text>
          <Text style={styles.roleCaption}>{config.caption}</Text>
        </View>
      </View>

      <View style={[styles.grid, phone && styles.gridPhone]}>
        <Card style={[styles.formCard, phone && styles.formCardPhone]}>
          <Text style={styles.cardEyebrow}>{form.userId ? "EDIT USER" : "CREATE USER"}</Text>
          <Text style={styles.cardTitle}>{form.userId ? `Edit ${config.singular}` : `Add ${config.singular}`}</Text>
          <Text style={styles.cardSubtitle}>
            {form.userId
              ? "Update the user name or account status."
              : "Set the ITS identity and a temporary password for first login."}
          </Text>

          <Input
            label="ITS number"
            value={form.itsNo}
            editable={!form.userId}
            keyboardType="number-pad"
            autoCapitalize="none"
            placeholder="Enter ITS number"
            helperText={form.userId ? "ITS number is fixed after creation." : undefined}
            onChangeText={itsNo => setForm(current => ({ ...current, itsNo }))}
          />
          <Input
            label="Name"
            value={form.name}
            autoCapitalize="words"
            placeholder="Enter full name"
            onChangeText={name => setForm(current => ({ ...current, name }))}
          />
          {!form.userId ? (
            <Input
              label="Temporary password"
              value={form.password}
              secureTextEntry
              placeholder="Enter password"
              onChangeText={password => setForm(current => ({ ...current, password }))}
            />
          ) : (
            <Select
              label="Status"
              value={form.isActive}
              options={statusOptions}
              onChange={isActive => setForm(current => ({ ...current, isActive }))}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={[styles.formActions, narrow && styles.formActionsNarrow]}>
            {form.userId ? (
              <Button title="Cancel" variant="outline" onPress={resetForm} style={styles.actionButton} />
            ) : null}
            <Button
              title={form.userId ? "Save changes" : `Create ${config.singular}`}
              loading={saving}
              onPress={submit}
              style={styles.actionButton}
            />
          </View>
        </Card>

        <Card style={styles.directoryCard}>
          <View style={[styles.directoryHeader, phone && styles.directoryHeaderPhone]}>
            <View style={styles.flex}>
              <Text style={styles.cardEyebrow}>DIRECTORY</Text>
              <Text style={styles.cardTitle}>{config.label}</Text>
              <Text style={styles.cardSubtitle}>{totalCount} user{totalCount === 1 ? "" : "s"}</Text>
            </View>
            <Button title="Refresh" compact variant="outline" onPress={() => load(pageNumber)} />
          </View>

          <Input
            label="Search"
            value={search}
            placeholder="Name or ITS number"
            onChangeText={value => {
              setSearch(value);
              setPageNumber(1);
            }}
          />

          {loading ? <ActivityIndicator color={colors.primaryStrong} style={styles.loader} /> : null}

          {!loading && !items.length ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No {config.label.toLowerCase()} found</Text>
              <Text style={styles.emptyText}>Create the first user or try another search.</Text>
            </View>
          ) : null}

          {items.map(item => (
            <View key={String(item.userId)} style={[styles.userRow, phone && styles.userRowPhone]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(item.name || config.singular).slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.userCopy}>
                <View style={styles.nameLine}>
                  <Text style={styles.userName}>{item.name || `Unnamed ${config.singular}`}</Text>
                  <View style={[styles.badge, item.isActive === false && styles.badgeInactive]}>
                    <Text style={[styles.badgeText, item.isActive === false && styles.badgeTextInactive]}>
                      {item.isActive === false ? "Inactive" : "Active"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.meta}>ITS {item.itsNo || "-"} · User ID {item.userId}</Text>
                {item.lastLoginAt ? <Text style={styles.meta}>Last login {new Date(item.lastLoginAt).toLocaleString("en-IN")}</Text> : null}
              </View>
              <View style={[styles.rowActions, phone && styles.rowActionsPhone]}>
                <Button title="Edit" compact variant="outline" onPress={() => edit(item)} />
                <Button
                  title="Delete"
                  compact
                  variant="danger"
                  loading={deletingId === item.userId}
                  onPress={() => remove(item)}
                />
              </View>
            </View>
          ))}

          <View style={styles.pagination}>
            <Button
              title="Previous"
              compact
              variant="outline"
              disabled={loading || pageNumber <= 1}
              onPress={() => setPageNumber(current => Math.max(1, current - 1))}
            />
            <Text style={styles.pageText}>{pageNumber} / {totalPages}</Text>
            <Button
              title="Next"
              compact
              variant="outline"
              disabled={loading || pageNumber >= totalPages}
              onPress={() => setPageNumber(current => Math.min(totalPages, current + 1))}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.lg },
  eyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  pageTitle: { color: colors.text, fontSize: 31, fontWeight: "900", marginTop: 4 },
  pageTitlePhone: { fontSize: 27 },
  pageSubtitle: { color: colors.muted, lineHeight: 20, marginTop: 5, maxWidth: 720 },
  tabsScroll: { marginBottom: spacing.md, flexGrow: 0 },
  tabs: { gap: spacing.xs, padding: 4, backgroundColor: colors.backgroundAlt, borderRadius: radius.lg },
  tab: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabText: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  tabTextActive: { color: colors.primaryStrong },
  roleIntro: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceTint, borderWidth: 1, borderColor: colors.primarySoftStrong, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  roleIntroPhone: { alignItems: "flex-start" },
  roleIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  roleIconText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  roleTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
  roleCaption: { color: colors.textSoft, marginTop: 3, lineHeight: 18, fontSize: 12 },
  grid: { flexDirection: "row", alignItems: "flex-start", gap: spacing.lg },
  gridPhone: { flexDirection: "column", gap: spacing.sm },
  formCard: { width: 390, flexShrink: 0 },
  formCardPhone: { width: "100%" },
  directoryCard: { flex: 1, minWidth: 0 },
  cardEyebrow: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  cardTitle: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: 4 },
  cardSubtitle: { color: colors.muted, marginTop: 5, marginBottom: spacing.md, lineHeight: 18, fontSize: 12 },
  error: { color: colors.danger, fontWeight: "700", marginBottom: spacing.md },
  formActions: { flexDirection: "row", gap: spacing.sm },
  formActionsNarrow: { flexDirection: "column" },
  actionButton: { flex: 1 },
  directoryHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  directoryHeaderPhone: { gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  loader: { marginVertical: spacing.lg },
  empty: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 16, textAlign: "center" },
  emptyText: { color: colors.muted, marginTop: 5, textAlign: "center" },
  userRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  userRowPhone: { alignItems: "flex-start", flexWrap: "wrap", gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 17 },
  userCopy: { flex: 1, minWidth: 150 },
  nameLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs },
  userName: { color: colors.text, fontWeight: "900", fontSize: 16, flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeInactive: { backgroundColor: colors.dangerSoft },
  badgeText: { color: colors.primaryStrong, fontSize: 10, fontWeight: "900" },
  badgeTextInactive: { color: colors.danger },
  rowActions: { flexDirection: "row", gap: spacing.xs, flexShrink: 0 },
  rowActionsPhone: { width: "100%", paddingLeft: 52 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.md },
  pageText: { color: colors.muted, fontWeight: "800", fontSize: 12 }
});
