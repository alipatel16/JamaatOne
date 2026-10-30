import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import Input from "./Input";

export default function RemotePagedSelect({ label, fetchPage, keyField, selected = [], onChange, multiple = false, disabled = false, exclude = () => false, maxSelected = 500 }) {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const result = await fetchPage(page, search.trim());
        if (active) { setItems(Array.isArray(result?.items) ? result.items : []); setPages(Math.max(1, Number(result?.totalPages || 1))); }
      } catch (error) { if (active) { setItems([]); setError(error.message || "Unable to load members."); } }
      finally { if (active) setLoading(false); }
    }, search.trim() ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [visible, page, search, fetchPage, retry]);
  const title = item => item.fullName || item.name || [item.firstName, item.fatherName, item.surname].filter(Boolean).join(" ") || "Unnamed member";
  function close() { setVisible(false); setSearch(""); setPage(1); }
  return <View style={styles.wrapper}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" disabled={disabled} style={[styles.input, disabled && styles.disabled]} onPress={() => setVisible(true)}>
      <Text style={styles.inputText}>{selected.length ? multiple ? `${selected.length} ${selected.length === 1 ? "member" : "members"} selected` : `${title(selected[0])} · ${selected[0].itsNo || selected[0].itsId || ""}` : "Search and select"}</Text>
      <Text style={styles.chevron}>⌄</Text>
    </Pressable>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.backdrop, width < 600 && styles.backdropPhone]}>
        <View style={[styles.sheet, width < 600 && styles.sheetPhone]}>
          <View style={styles.header}><Text style={styles.title}>{label}</Text><Button title="Done" compact onPress={close} /></View>
          <Input label="Search by name or ITS" autoComplete="off" value={search} onChangeText={value => { setSearch(value); setPage(1); }} placeholder="Type to search…" />
          {multiple ? <Text style={styles.meta}>{selected.length} / {maxSelected} selected · selections stay across pages</Text> : null}
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          {error ? <View><Text style={styles.error}>{error}</Text><Button title="Retry" compact variant="outline" onPress={() => setRetry(value => value + 1)} /></View> : null}
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {!loading ? items.filter(item => !exclude(item)).map(item => {
              const checked = selected.some(value => String(value[keyField]) === String(item[keyField]));
              const limit = multiple && !checked && selected.length >= maxSelected;
              return <Pressable key={String(item[keyField])} accessibilityRole={multiple ? "checkbox" : "button"} accessibilityState={{ checked, disabled: limit }} disabled={limit} style={[styles.option, checked && styles.selected, limit && styles.disabled]} onPress={() => {
                onChange(multiple ? checked ? selected.filter(value => String(value[keyField]) !== String(item[keyField])) : [...selected, item] : [item]);
                if (!multiple) close();
              }}>
                <View style={styles.copy}><Text style={styles.name}>{title(item)}</Text><Text style={styles.meta}>ITS {item.itsNo || item.itsId || "—"}</Text></View>
                <Text style={styles.mark}>{checked ? "✓" : multiple ? "+" : "›"}</Text>
              </Pressable>;
            }) : null}
            {!loading && !error && !items.filter(item => !exclude(item)).length ? <Text style={styles.empty}>No matching members on this page.</Text> : null}
          </ScrollView>
          <View style={styles.footer}><Button title="Previous" compact variant="outline" disabled={loading || page <= 1} onPress={() => setPage(value => value - 1)} /><Text style={styles.meta}>{page} / {pages}</Text><Button title="Next" compact variant="outline" disabled={loading || page >= pages} onPress={() => setPage(value => value + 1)} /></View>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md }, label: { color: colors.textSoft, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface },
  inputText: { color: colors.textSoft, flex: 1 }, chevron: { color: colors.muted, fontSize: 18 }, disabled: { opacity: 0.5 },
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.overlay, padding: spacing.md }, backdropPhone: { padding: 0, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 640, height: "85%", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.xl }, sheetPhone: { height: "94%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md }, title: { color: colors.text, fontSize: 20, fontWeight: "900", flex: 1 },
  list: { flex: 1, marginVertical: spacing.sm }, option: { flexDirection: "row", alignItems: "center", padding: spacing.sm, borderRadius: radius.md, minHeight: 64, marginBottom: 4 }, selected: { backgroundColor: colors.primarySoft },
  copy: { flex: 1, minWidth: 0 }, name: { color: colors.text, fontSize: 14, fontWeight: "800" }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, mark: { color: colors.primaryStrong, fontSize: 22, marginLeft: spacing.sm },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }, empty: { color: colors.muted, padding: spacing.md }, error: { color: colors.danger, marginBottom: spacing.sm }
});
