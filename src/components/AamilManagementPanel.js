import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { usersApi } from "../api/usersApi";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import Select from "./Select";

const PAGE_SIZE = 20;
const EMPTY_FORM = {
  userId: null,
  itsNo: "",
  name: "",
  password: "",
  jamaatId: "",
  isActive: "true"
};

function statusOptions() {
  return [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
  ];
}

async function confirmDelete(name) {
  const message = `Delete ${name || "this Aamil"}?`;
  if (Platform.OS === "web") {
    return globalThis.confirm?.(`Delete Aamil\n\n${message}`) ?? false;
  }
  return new Promise(resolve => {
    Alert.alert("Delete Aamil", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) }
    ]);
  });
}

export default function AamilManagementPanel({ jamaats = [] }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 390;
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [jamaatFilter, setJamaatFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const jamaatOptions = useMemo(
    () =>
      jamaats
        .filter(item => item?.isActive !== false)
        .map(item => ({
          label: `${item.name || "Unnamed Jamaat"} · ID ${item.jamaatId}`,
          value: String(item.jamaatId)
        })),
    [jamaats]
  );

  const filterOptions = useMemo(
    () => [{ label: "All Jamaats", value: "" }, ...jamaatOptions],
    [jamaatOptions]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(pageNumber), search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [pageNumber, search, jamaatFilter]);

  async function load(page = 1) {
    try {
      setLoading(true);
      setError("");
      const result = await usersApi.getAamils({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        jamaatId: jamaatFilter || undefined
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
      setTotalCount(Number(result?.totalCount || 0));
    } catch (requestError) {
      setItems([]);
      setError(requestError.message || "Unable to load Aamil users.");
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
      const detail = await usersApi.getAamil(item.userId);
      const record = detail || item;
      setForm({
        userId: record.userId,
        itsNo: record.itsNo || "",
        name: record.name || "",
        password: "",
        jamaatId: String(record.jamaatId || ""),
        isActive: String(record.isActive !== false)
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load Aamil details.");
    }
  }

  async function submit() {
    const editing = Boolean(form.userId);
    if (!editing && !form.itsNo.trim()) {
      setError("ITS number is required.");
      return;
    }
    if (!form.name.trim()) {
      setError("Aamil name is required.");
      return;
    }
    if (!editing && !form.password) {
      setError("Temporary password is required.");
      return;
    }
    if (!Number(form.jamaatId)) {
      setError("Select the Jamaat for this Aamil.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editing) {
        await usersApi.updateAamil(form.userId, {
          name: form.name,
          jamaatId: form.jamaatId,
          password: form.password,
          isActive: form.isActive === "true"
        });
      } else {
        await usersApi.createAamil({
          itsNo: form.itsNo,
          name: form.name,
          password: form.password,
          jamaatId: form.jamaatId
        });
      }
      resetForm();
      if (pageNumber === 1) await load(1);
      else setPageNumber(1);
    } catch (requestError) {
      setError(requestError.message || `Unable to ${editing ? "update" : "create"} Aamil.`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!(await confirmDelete(item.name))) return;
    try {
      setDeletingId(item.userId);
      setError("");
      await usersApi.deleteAamil(item.userId);
      if (form.userId === item.userId) resetForm();
      await load(pageNumber);
    } catch (requestError) {
      setError(requestError.message || "Unable to delete Aamil.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <View style={[styles.grid, phone && styles.gridPhone]}>
      <Card style={[styles.formCard, phone && styles.formCardPhone]}>
        <Text style={styles.eyebrow}>SUPER ADMIN ONLY</Text>
        <Text style={styles.title}>{form.userId ? "Edit Aamil" : "Create Aamil"}</Text>
        <Text style={styles.subtitle}>
          Create, assign and maintain Aamil access for the correct Jamaat.
        </Text>

        <Input
          label="ITS number"
          value={form.itsNo}
          editable={!form.userId}
          keyboardType="number-pad"
          autoCapitalize="none"
          placeholder="Enter ITS number"
          onChangeText={itsNo => setForm(current => ({ ...current, itsNo }))}
          helperText={form.userId ? "ITS number cannot be changed after creation." : undefined}
        />
        <Input
          label="Name"
          value={form.name}
          autoCapitalize="words"
          placeholder="Enter Aamil name"
          onChangeText={name => setForm(current => ({ ...current, name }))}
        />
        <Input
          label={form.userId ? "New password (optional)" : "Temporary password"}
          value={form.password}
          secureTextEntry
          placeholder={form.userId ? "Leave blank to keep current password" : "Enter password"}
          onChangeText={password => setForm(current => ({ ...current, password }))}
        />
        <Select
          label="Jamaat"
          value={form.jamaatId}
          options={jamaatOptions}
          placeholder={jamaatOptions.length ? "Select Jamaat" : "Create a Jamaat first"}
          onChange={jamaatId => setForm(current => ({ ...current, jamaatId }))}
        />
        {form.userId ? (
          <Select
            label="Status"
            value={form.isActive}
            options={statusOptions()}
            onChange={isActive => setForm(current => ({ ...current, isActive }))}
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.formActions, narrow && styles.formActionsNarrow]}>
          {form.userId ? (
            <Button title="Cancel" variant="outline" onPress={resetForm} style={styles.flexButton} />
          ) : null}
          <Button
            title={form.userId ? "Save changes" : "Create Aamil"}
            loading={saving}
            disabled={!jamaatOptions.length}
            onPress={submit}
            style={styles.flexButton}
          />
        </View>
      </Card>

      <Card style={styles.directoryCard}>
        <View style={[styles.directoryHeader, phone && styles.directoryHeaderPhone]}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>DIRECTORY</Text>
            <Text style={styles.title}>Aamil users</Text>
            <Text style={styles.subtitle}>{totalCount} Aamil record{totalCount === 1 ? "" : "s"}</Text>
          </View>
          <Button title="Refresh" compact variant="outline" onPress={() => load(pageNumber)} />
        </View>

        <View style={[styles.filters, phone && styles.filtersPhone]}>
          <Input
            label="Search"
            value={search}
            placeholder="Name or ITS number"
            onChangeText={value => {
              setSearch(value);
              setPageNumber(1);
            }}
            style={[styles.searchInput, phone && styles.searchInputPhone]}
          />
          <View style={[styles.filterSelect, phone && styles.filterSelectPhone]}>
            <Select
              label="Jamaat"
              value={jamaatFilter}
              options={filterOptions}
              onChange={value => {
                setJamaatFilter(value);
                setPageNumber(1);
              }}
            />
          </View>
        </View>

        {loading ? <ActivityIndicator color={colors.primaryStrong} style={styles.loader} /> : null}

        {!loading && !items.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Aamil users found</Text>
            <Text style={styles.emptyText}>Create an Aamil or change the current search filters.</Text>
          </View>
        ) : null}

        {items.map(item => (
          <View key={String(item.userId)} style={[styles.row, phone && styles.rowPhone]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{String(item.name || "A").slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.rowCopy}>
              <View style={styles.nameLine}>
                <Text style={styles.name}>{item.name || "Unnamed Aamil"}</Text>
                <View style={[styles.badge, item.isActive === false && styles.badgeInactive]}>
                  <Text style={[styles.badgeText, item.isActive === false && styles.badgeTextInactive]}>
                    {item.isActive === false ? "Inactive" : "Active"}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>ITS {item.itsNo || "-"} · User ID {item.userId}</Text>
              <Text style={styles.meta}>{item.jamaatName || `Jamaat ${item.jamaatId || "-"}`}</Text>
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
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", alignItems: "flex-start", gap: spacing.lg },
  gridPhone: { flexDirection: "column", gap: spacing.sm },
  formCard: { width: 390, flexShrink: 0 },
  formCardPhone: { width: "100%" },
  directoryCard: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.muted, marginTop: 5, marginBottom: spacing.lg, lineHeight: 19 },
  error: { color: colors.danger, fontWeight: "700", marginBottom: spacing.md },
  formActions: { flexDirection: "row", gap: spacing.sm },
  formActionsNarrow: { flexDirection: "column" },
  flexButton: { flex: 1 },
  directoryHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  directoryHeaderPhone: { gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  filters: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.xs },
  filtersPhone: { flexDirection: "column", gap: 0 },
  searchInput: { flex: 1 },
  searchInputPhone: { flex: 0, width: "100%" },
  filterSelect: { width: 230 },
  filterSelectPhone: { width: "100%" },
  loader: { marginVertical: spacing.lg },
  empty: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
  emptyText: { color: colors.muted, marginTop: 5, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rowPhone: { alignItems: "flex-start", flexWrap: "wrap", gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 17 },
  rowCopy: { flex: 1, minWidth: 150 },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  name: { color: colors.text, fontWeight: "900", fontSize: 16, flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeInactive: { backgroundColor: colors.dangerSoft },
  badgeText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 10 },
  badgeTextInactive: { color: colors.danger },
  rowActions: { flexDirection: "row", gap: spacing.xs, flexShrink: 0 },
  rowActionsPhone: { width: "100%", paddingLeft: 52 },
  pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  pageText: { color: colors.muted, fontWeight: "800", fontSize: 12 }
});
