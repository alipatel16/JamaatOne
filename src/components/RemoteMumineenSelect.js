import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { mumineenApi } from "../api/mumineenApi";
import { colors, radius, spacing } from "../theme";

function displayName(item) {
  return (
    item?.fullName ||
    [item?.firstName, item?.fatherName, item?.surname].filter(Boolean).join(" ") ||
    "Unnamed Mumin"
  );
}

export default function RemoteMumineenSelect({
  label,
  value,
  onChange,
  placeholder = "Search Mumineen by name or ITS",
  disabled = false,
  initialItem = null
}) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(initialItem ? [initialItem] : []);
  const [selected, setSelected] = useState(initialItem || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }

    if (initialItem?.muminId && String(initialItem.muminId) === String(value)) {
      setSelected(initialItem);
    }
  }, [initialItem, value]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(async () => {
      const id = ++requestId.current;
      try {
        setLoading(true);
        setError("");
        const result = await mumineenApi.getPaged(1, 20, query.trim());
        if (id !== requestId.current) return;
        setItems(Array.isArray(result?.items) ? result.items : []);
      } catch (requestError) {
        if (id !== requestId.current) return;
        setItems([]);
        setError(requestError.message || "Unable to search Mumineen.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, visible]);

  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    return `${displayName(selected)} · ITS ${selected.itsId || "-"}`;
  }, [selected]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        disabled={disabled}
        style={[styles.input, disabled && styles.disabled]}
        onPress={() => setVisible(true)}
      >
        <Text style={selectedLabel ? styles.value : styles.placeholder} numberOfLines={1}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{label || "Select Mumin"}</Text>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, ITS ID, mobile, family ID..."
              placeholderTextColor={colors.muted}
              style={styles.search}
            />
            {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {items.map(item => (
                <Pressable
                  key={String(item.muminId)}
                  style={styles.option}
                  onPress={() => {
                    setSelected(item);
                    onChange?.(String(item.muminId), item);
                    setVisible(false);
                    setQuery("");
                  }}
                >
                  <Text style={styles.optionTitle}>{displayName(item)}</Text>
                  <Text style={styles.optionMeta}>
                    ITS {item.itsId || "-"}
                    {item.mobile ? ` · ${item.mobile}` : ""}
                    {item.hofFmType ? ` · ${item.hofFmType}` : ""}
                  </Text>
                </Pressable>
              ))}
              {!loading && !items.length ? (
                <Text style={styles.empty}>No matching Mumineen found.</Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textSoft, fontWeight: "700", fontSize: 13 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center"
  },
  disabled: { opacity: 0.55 },
  value: { color: colors.text, flex: 1 },
  placeholder: { color: colors.muted, flex: 1 },
  chevron: { marginLeft: spacing.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.35)", justifyContent: "center", padding: spacing.md },
  sheet: { width: "100%", maxWidth: 640, maxHeight: "80%", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  title: { fontSize: 19, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  search: { minHeight: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, marginBottom: spacing.sm },
  loader: { marginVertical: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.sm },
  option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optionTitle: { color: colors.text, fontWeight: "700" },
  optionMeta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  empty: { padding: spacing.lg, color: colors.muted, textAlign: "center" }
});
