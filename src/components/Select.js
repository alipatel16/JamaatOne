import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../theme";

export default function Select({ label, value, options = [], onChange, placeholder = "Select" }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const [visible, setVisible] = useState(false);
  const selected = options.find(item => String(item.value) === String(value));

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.input} onPress={() => setVisible(true)}>
        <Text style={selected ? styles.value : styles.placeholder} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={[styles.backdrop, phone && styles.backdropPhone]} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, phone && styles.sheetPhone, shadows.floating]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleWrap}>
                <Text style={styles.eyebrow}>SELECT</Text>
                <Text style={styles.title}>{label || "Choose an option"}</Text>
              </View>
              <Pressable style={styles.close} onPress={() => setVisible(false)}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map(item => {
                const active = String(item.value) === String(value);
                return (
                  <Pressable
                    key={String(item.value)}
                    style={[styles.option, active && styles.selected]}
                    onPress={() => {
                      onChange(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
              {!options.length ? <Text style={styles.empty}>No options available.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontFamily: typography.family, marginBottom: spacing.xs, color: colors.textSoft, fontSize: 13, fontWeight: "800" },
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
  value: { color: colors.text, flex: 1, fontFamily: typography.family },
  placeholder: { color: colors.muted, flex: 1, fontFamily: typography.family },
  chevron: { color: colors.muted, fontSize: 18, marginLeft: spacing.sm },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.md },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  sheet: { width: "100%", maxWidth: 560, maxHeight: "78%", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  sheetPhone: { maxHeight: "70%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.md },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  sheetTitleWrap: { flex: 1 },
  eyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundAlt },
  closeText: { color: colors.textSoft, fontSize: 24, lineHeight: 26 },
  option: { minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  selected: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.text, flex: 1 },
  optionTextActive: { color: colors.primaryStrong, fontWeight: "800" },
  check: { color: colors.primaryStrong, fontWeight: "900", fontSize: 16, marginLeft: spacing.md },
  empty: { color: colors.muted, padding: spacing.lg, textAlign: "center" }
});
