import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "../theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function localDateValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function transactionDateToIso(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  // Midday UTC keeps the selected calendar date stable across timezones while
  // still satisfying the API's date-time contract.
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0)).toISOString();
}

function parseDateValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysForMonth(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < firstDay; index += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DatePickerField({ label = "Transaction date", value, onChange, required }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const [visible, setVisible] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    const next = parseDateValue(value);
    setDisplayYear(next.getFullYear());
    setDisplayMonth(next.getMonth());
  }, [value]);

  const displayText = useMemo(() => {
    if (!value) return "Select date";
    const date = parseDateValue(value);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }, [value]);

  const cells = useMemo(
    () => daysForMonth(displayYear, displayMonth),
    [displayYear, displayMonth]
  );

  function moveMonth(delta) {
    const next = new Date(displayYear, displayMonth + delta, 1);
    setDisplayYear(next.getFullYear());
    setDisplayMonth(next.getMonth());
  }

  function selectDay(day) {
    const next = new Date(displayYear, displayMonth, day);
    onChange(localDateValue(next));
    setVisible(false);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}{required ? " *" : ""}
      </Text>
      <Pressable style={styles.field} onPress={() => setVisible(true)}>
        <View style={styles.valueRow}>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
          <Text style={value ? styles.value : styles.placeholder}>{displayText}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.muted} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={[styles.backdrop, phone && styles.backdropPhone]} onPress={() => setVisible(false)}>
          <Pressable style={[styles.calendar, phone && styles.calendarPhone]} onPress={() => {}}>
            <View style={styles.header}>
              <Pressable style={styles.navButton} onPress={() => moveMonth(-1)}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primaryStrong} />
              </Pressable>
              <Text style={styles.monthTitle}>{MONTHS[displayMonth]} {displayYear}</Text>
              <Pressable style={styles.navButton} onPress={() => moveMonth(1)}>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primaryStrong} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
                const cellValue = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const selected = cellValue === value;
                const today = cellValue === localDateValue();
                return (
                  <View key={cellValue} style={styles.dayCell}>
                    <Pressable
                      style={[
                        styles.dayButton,
                        narrow && styles.dayButtonNarrow,
                        today && !selected && styles.todayButton,
                        selected && styles.selectedButton
                      ]}
                      onPress={() => selectDay(day)}
                    >
                      <Text style={[styles.dayText, selected && styles.selectedDayText]}>{day}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Pressable
              style={styles.todayAction}
              onPress={() => {
                onChange(localDateValue());
                setVisible(false);
              }}
            >
              <MaterialCommunityIcons name="calendar-today" size={18} color={colors.primaryStrong} />
              <Text style={styles.todayText}>Today</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    fontFamily: typography.family,
    marginBottom: spacing.xs,
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "800"
  },
  field: {
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
  valueRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  value: { color: colors.text, fontFamily: typography.family, fontSize: 16 },
  placeholder: { color: colors.muted, fontFamily: typography.family, fontSize: 16 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  calendar: {
    width: "100%",
    maxWidth: 390,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  calendarPhone: { maxWidth: "100%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  monthTitle: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "900"
  },
  weekRow: { flexDirection: "row", marginBottom: spacing.xs },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "800"
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  dayButtonNarrow: { width: 32, height: 32 },
  todayButton: { borderWidth: 1, borderColor: colors.primary },
  selectedButton: { backgroundColor: colors.primary },
  dayText: { color: colors.text, fontFamily: typography.family, fontWeight: "700" },
  selectedDayText: { color: colors.surface, fontWeight: "900" },
  todayAction: {
    alignSelf: "flex-end",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  todayText: { color: colors.primaryStrong, fontFamily: typography.family, fontWeight: "900" }
});
