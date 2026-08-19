import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";

import { colors, radius, shadows, spacing, typography } from "../theme";

export default function MultiSelect({
  label,
  values = [],
  options = [],
  onChange,
  placeholder = "Select one or more",
  searchPlaceholder = "Search options",
  disabled = false
}) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedValues = useMemo(
    () => (Array.isArray(values) ? values.map(value => String(value)) : []),
    [values]
  );

  const selectedOptions = useMemo(
    () =>
      options.filter(item =>
        normalizedValues.includes(String(item.value))
      ),
    [normalizedValues, options]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter(item =>
      `${item.label || ""} ${item.searchText || ""}`.toLowerCase().includes(query)
    );
  }, [options, search]);

  const displayValue = selectedOptions.length
    ? selectedOptions.length <= 2
      ? selectedOptions.map(item => item.label).join(", ")
      : `${selectedOptions.length} selected`
    : "";

  function close() {
    setVisible(false);
    setSearch("");
  }

  function toggle(value) {
    const key = String(value);
    const exists = normalizedValues.includes(key);
    const next = exists
      ? normalizedValues.filter(item => item !== key)
      : [...normalizedValues, key];
    onChange?.(next);
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        disabled={disabled}
        style={[styles.input, disabled && styles.disabled]}
        onPress={() => setVisible(true)}
      >
        <Text style={displayValue ? styles.value : styles.placeholder} numberOfLines={1}>
          {displayValue || placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      {selectedOptions.length ? (
        <View style={styles.chips}>
          {selectedOptions.map(item => (
            <Pressable
              key={String(item.value)}
              disabled={disabled}
              onPress={() => toggle(item.value)}
              style={styles.chip}
            >
              <Text style={styles.chipText} numberOfLines={1}>{item.label}</Text>
              {!disabled ? <Text style={styles.chipRemove}>×</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          style={[styles.backdrop, phone && styles.backdropPhone]}
          onPress={close}
        >
          <Pressable
            style={[styles.sheet, phone && styles.sheetPhone, shadows.floating]}
            onPress={() => {}}
          >
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>MULTI SELECT</Text>
                <Text style={styles.title}>{label || "Choose options"}</Text>
                <Text style={styles.subtitle}>
                  Select any number of options, then close when finished.
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={close}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.muted}
              selectionColor={colors.primary}
              style={styles.search}
            />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
            >
              {filtered.map(item => {
                const active = normalizedValues.includes(String(item.value));
                return (
                  <Pressable
                    key={String(item.value)}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => toggle(item.value)}
                  >
                    <View style={[styles.checkbox, active && styles.checkboxActive]}>
                      {active ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              {!filtered.length ? (
                <Text style={styles.empty}>No matching options.</Text>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {normalizedValues.length} selected
              </Text>
              <Pressable style={styles.doneButton} onPress={close}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", maxWidth: "100%", marginBottom: spacing.md },
  label: {
    fontFamily: typography.family,
    marginBottom: spacing.xs,
    color: colors.textSoft,
    fontWeight: "800",
    fontSize: 13
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  disabled: { opacity: 0.55 },
  value: { color: colors.text, flex: 1, fontFamily: typography.family },
  placeholder: { color: colors.muted, flex: 1, fontFamily: typography.family },
  chevron: { color: colors.muted, fontSize: 18, marginLeft: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.xs },
  chip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft
  },
  chipText: { color: colors.primaryStrong, fontSize: 11, fontWeight: "800", flexShrink: 1 },
  chipRemove: { color: colors.primaryStrong, fontSize: 16, lineHeight: 16, fontWeight: "900" },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.md
  },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  sheet: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "82%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  sheetPhone: {
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md
  },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundAlt
  },
  closeText: { color: colors.textSoft, fontSize: 25, lineHeight: 27 },
  search: {
    minHeight: 50,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontFamily: typography.family,
    ...(Platform.OS === "web" ? { outlineStyle: "none", outlineWidth: 0 } : {})
  },
  list: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  option: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 3
  },
  optionActive: { backgroundColor: colors.primarySoft },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  checkboxActive: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  check: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  optionText: { color: colors.text, flex: 1 },
  optionTextActive: { color: colors.primaryStrong, fontWeight: "800" },
  empty: { color: colors.muted, padding: spacing.lg, textAlign: "center" },
  footer: {
    minHeight: 68,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  footerText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  doneButton: {
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  doneText: { color: "#FFFFFF", fontWeight: "900" }
});
