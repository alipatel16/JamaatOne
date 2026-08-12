import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Platform
} from "react-native";

import { mumineenApi } from "../api/mumineenApi";
import { colors, radius, shadows, spacing, typography } from "../theme";

function displayName(item) {
  return (
    item?.fullName ||
    [item?.firstName, item?.fatherName, item?.surname].filter(Boolean).join(" ") ||
    "Unnamed Mumin"
  );
}

function initials(item) {
  const parts = displayName(item).split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "M"}${parts[parts.length - 1]?.[0] || ""}`.toUpperCase();
}

export default function RemoteMumineenSelect({
  label,
  value,
  onChange,
  placeholder = "Search Mumineen by name or ITS",
  disabled = false,
  initialItem = null
}) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
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
        setItems(
          (Array.isArray(result?.items) ? result.items : []).filter(
            item => item?.isActive !== false
          )
        );
      } catch (requestError) {
        if (id !== requestId.current) return;
        setItems([]);
        setError(requestError.message || "Unable to search Mumineen.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, visible]);

  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    return `${displayName(selected)} · ITS ${selected.itsId || "-"}`;
  }, [selected]);

  function close() {
    setVisible(false);
    setQuery("");
    setError("");
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        style={({ pressed }) => [styles.input, disabled && styles.disabled, pressed && !disabled && styles.inputPressed]}
        onPress={() => setVisible(true)}
      >
        <View style={styles.searchGlyph}><Text style={styles.searchGlyphText}>⌕</Text></View>
        <Text style={selectedLabel ? styles.value : styles.placeholder} numberOfLines={1}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={[styles.backdrop, phone && styles.backdropPhone]} onPress={close}>
          <Pressable style={[styles.sheet, phone && styles.sheetPhone, shadows.floating]} onPress={() => {}}>
            <View style={[styles.sheetHeader, phone && styles.sheetHeaderPhone]}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>MUMINEEN</Text>
                <Text style={styles.title}>Find a member</Text>
                <Text style={styles.subtitle}>Search by name, ITS ID, mobile or family ID.</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={close}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={[styles.searchWrap, phone && styles.searchWrapPhone]}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Type to search..."
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
                style={styles.search}
              />
              {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
              {items.map(item => {
                const active = String(item.muminId) === String(value);
                return (
                  <Pressable
                    key={String(item.muminId)}
                    style={({ pressed }) => [styles.option, narrow && styles.optionNarrow, active && styles.optionActive, pressed && styles.optionPressed]}
                    onPress={() => {
                      setSelected(item);
                      onChange?.(String(item.muminId), item);
                      close();
                    }}
                  >
                    <View style={[styles.avatar, active && styles.avatarActive]}>
                      <Text style={[styles.avatarText, active && styles.avatarTextActive]}>{initials(item)}</Text>
                    </View>
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionTitle}>{displayName(item)}</Text>
                      <Text style={styles.optionMeta}>
                        ITS {item.itsId || "-"}{item.mobile ? ` · ${item.mobile}` : ""}{item.hofFmType ? ` · ${item.hofFmType}` : ""}
                      </Text>
                      {item.jamaatName || item.jamaat ? <Text style={styles.jamaat}>{item.jamaatName || item.jamaat}</Text> : null}
                    </View>
                    <Text style={styles.selectMark}>{active ? "✓" : "›"}</Text>
                  </Pressable>
                );
              })}
              {!loading && !items.length ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No matching Mumineen</Text>
                  <Text style={styles.empty}>Try a different name, ITS ID, mobile or family ID.</Text>
                </View>
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
  label: { fontFamily: typography.family, marginBottom: spacing.xs, color: colors.textSoft, fontWeight: "800", fontSize: 13 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center" },
  inputPressed: { borderColor: colors.primary },
  disabled: { opacity: 0.55 },
  searchGlyph: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  searchGlyphText: { color: colors.primaryStrong, fontSize: 18, fontWeight: "900" },
  value: { color: colors.text, flex: 1, fontWeight: "700" },
  placeholder: { color: colors.muted, flex: 1 },
  chevron: { marginLeft: spacing.sm, color: colors.muted, fontSize: 18 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.md },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  sheet: { width: "100%", maxWidth: 680, maxHeight: "84%", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  sheetPhone: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", padding: spacing.lg, paddingBottom: spacing.md },
  sheetHeaderPhone: { padding: spacing.md, paddingBottom: spacing.sm },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.backgroundAlt, alignItems: "center", justifyContent: "center", marginLeft: spacing.md },
  closeText: { color: colors.textSoft, fontSize: 25, lineHeight: 27 },
  searchWrap: { minHeight: 52, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center" },
  searchWrapPhone: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  searchIcon: { color: colors.primaryStrong, fontSize: 18, marginRight: spacing.sm },
  search: {
    flex: 1,
    minHeight: 50,
    color: colors.text,
    fontFamily: typography.family,
    ...(Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {})
  },
  error: { color: colors.danger, marginHorizontal: spacing.lg, marginBottom: spacing.sm, fontSize: 12 },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  listContent: { padding: spacing.sm },
  option: { minHeight: 76, borderRadius: radius.lg, padding: spacing.sm, flexDirection: "row", alignItems: "center", marginBottom: 3 },
  optionNarrow: { minHeight: 68 },
  optionActive: { backgroundColor: colors.primarySoft },
  optionPressed: { backgroundColor: colors.backgroundAlt },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.backgroundAlt, alignItems: "center", justifyContent: "center" },
  avatarActive: { backgroundColor: colors.primaryStrong },
  avatarText: { color: colors.textSoft, fontWeight: "900", fontSize: 12 },
  avatarTextActive: { color: "#fff" },
  optionCopy: { flex: 1, minWidth: 0, marginLeft: spacing.sm },
  optionTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  optionMeta: { color: colors.muted, marginTop: 3, fontSize: 11 },
  jamaat: { color: colors.primaryStrong, fontWeight: "700", marginTop: 3, fontSize: 11 },
  selectMark: { color: colors.primaryStrong, fontWeight: "900", fontSize: 20, marginLeft: spacing.sm },
  emptyBox: { padding: spacing.xl, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "900" },
  empty: { color: colors.muted, textAlign: "center", marginTop: 5, fontSize: 12 }
});
