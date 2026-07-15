import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, spacing } from "../theme";

export default function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
}) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((item) => item.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.input} onPress={() => setVisible(true)}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected?.label || placeholder}
        </Text>
        <Text>⌄</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{label || "Select"}</Text>
            <ScrollView>
              {options.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    styles.option,
                    item.value === value && styles.selected,
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.text, fontWeight: "600" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: { color: colors.text },
  placeholder: { color: colors.muted },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: spacing.md,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "75%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
  },
  title: { fontSize: 19, fontWeight: "800", marginBottom: spacing.sm },
  option: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  selected: { backgroundColor: "#EAF2F0" },
});
