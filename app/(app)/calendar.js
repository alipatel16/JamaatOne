import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import Screen from "../../src/components/Screen";
import LoadingView from "../../src/components/LoadingView";
import { colors, spacing } from "../../src/theme";
import { getHijriForGregorian, getHijriMonth } from "../../src/services/islamicData";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MISRI_MONTH_NAMES = [
  "Moharram al-Haram",
  "Safarul Muzaffar",
  "Rabi al-Awwal",
  "Rabi al-Aakhar",
  "Jumada al-Ula",
  "Jumada al-Ukhra",
  "Rajab al-Asab",
  "Shaban al-Karim",
  "Ramadan al-Moazzam",
  "Shawwal al-Mukarram",
  "Zilqadatil Haram",
  "Zilhajjatil Haram"
];

function parseGregorianDate(value) {
  const [day, month, year] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const [cursor, setCursor] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    initialise();
  }, []);

  useEffect(() => {
    if (cursor) loadMonth(cursor.month, cursor.year);
  }, [cursor?.month, cursor?.year]);

  async function initialise() {
    try {
      setLoading(true);
      setError("");
      const current = await getHijriForGregorian(new Date());
      setCursor({
        month: Number(current.hijri.month.number),
        year: Number(current.hijri.year)
      });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function loadMonth(month, year) {
    try {
      setLoading(true);
      setError("");
      const result = await getHijriMonth(month, year);
      const mapped = result.map(item => ({
        hijriDay: Number(item.hijri.day),
        hijriMonth: item.hijri.month,
        hijriYear: Number(item.hijri.year),
        gregorian: item.gregorian,
        date: parseGregorianDate(item.gregorian.date)
      }));

      setDays(mapped);
      const todayIso = toIso(new Date());
      const todayIndex = mapped.findIndex(item => toIso(item.date) === todayIso);
      setSelectedIndex(todayIndex >= 0 ? todayIndex : 0);
    } catch (e) {
      setError(e.message);
      setDays([]);
    } finally {
      setLoading(false);
    }
  }

  function changeHijriMonth(delta) {
    setCursor(current => {
      let month = current.month + delta;
      let year = current.year;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      return { month, year };
    });
  }

  const firstWeekday = days.length ? days[0].date.getDay() : 0;
  const cells = useMemo(
    () => [...Array.from({ length: firstWeekday }, () => null), ...days],
    [days, firstWeekday]
  );
  const selected = days[selectedIndex];

  if (loading && !days.length && !error) return <LoadingView />;

  return (
    <Screen>
      <View style={[styles.hero, isWide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>HIJRI CALENDAR</Text>
          <Text style={styles.title}>Your Islamic month, first.</Text>
          <Text style={styles.subtitle}>
            The main grid follows the Hijri month. Gregorian dates are shown only as a reference inside each Hijri day.
          </Text>
        </View>

        <View style={styles.monthNavigator}>
          <Pressable style={styles.navButton} onPress={() => changeHijriMonth(-1)}>
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <View style={styles.monthCenter}>
            <Text style={styles.hijriMonth}>{MISRI_MONTH_NAMES[(cursor?.month || 1) - 1]}</Text>
            <Text style={styles.hijriYear}>{cursor?.year || "—"} H</Text>
          </View>
          <Pressable style={styles.navButton} onPress={() => changeHijriMonth(1)}>
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Calendar unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={initialise}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!!days.length && (
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={styles.calendarCard}>
            <View style={styles.weekRow}>
              {WEEKDAYS.map(day => (
                <Text key={day} style={styles.weekday}>{isWide ? day : day[0]}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
                const actualIndex = index - firstWeekday;
                const isSelected = actualIndex === selectedIndex;
                const isToday = toIso(day.date) === toIso(new Date());

                return (
                  <Pressable
                    key={`${day.hijriYear}-${day.hijriMonth.number}-${day.hijriDay}`}
                    onPress={() => setSelectedIndex(actualIndex)}
                    style={[
                      styles.dayCell,
                      isToday && styles.todayCell,
                      isSelected && styles.selectedCell
                    ]}
                  >
                    <Text style={[styles.hijriDay, isSelected && styles.selectedText]}>{day.hijriDay}</Text>
                    <Text style={[styles.gregorianDate, isSelected && styles.selectedSubText]}>
                      {day.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </Text>
                    {isToday ? <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.detailCard, isWide && styles.detailCardWide]}>
            <Text style={styles.detailEyebrow}>SELECTED HIJRI DATE</Text>
            <Text style={styles.detailDay}>{selected?.hijriDay || "—"}</Text>
            <Text style={styles.detailMonth}>
              {MISRI_MONTH_NAMES[(selected?.hijriMonth?.number || cursor?.month || 1) - 1]} {selected?.hijriYear || cursor?.year} H
            </Text>
            <View style={styles.divider} />
            <Text style={styles.gregorianLabel}>Gregorian reference</Text>
            <Text style={styles.gregorianFull}>
              {selected?.date?.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              }) || "—"}
            </Text>
            <Text style={styles.sourceNote}>Calendar dates are loaded live rather than generated from static app data.</Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.lg },
  heroWide: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 28 },
  heroCopy: { flex: 1, maxWidth: 620 },
  eyebrow: { color: colors.accent, fontWeight: "900", fontSize: 11, letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: "900", marginTop: 7 },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 8, maxWidth: 610 },
  monthNavigator: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 8 },
  monthCenter: { minWidth: 190, alignItems: "center", paddingHorizontal: 8 },
  hijriMonth: { color: colors.text, fontWeight: "900", fontSize: 16, textAlign: "center" },
  hijriYear: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  navButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  navText: { color: colors.text, fontSize: 28, lineHeight: 30 },
  layout: { gap: spacing.md },
  layoutWide: { flexDirection: "row", alignItems: "flex-start" },
  calendarCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 12 },
  weekRow: { flexDirection: "row", paddingVertical: 8 },
  weekday: { width: "14.2857%", textAlign: "center", color: colors.muted, fontSize: 11, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.2857%", aspectRatio: 1, minHeight: 54, borderRadius: 15, alignItems: "center", justifyContent: "center", marginVertical: 2 },
  todayCell: { borderWidth: 1, borderColor: "#DDBD48" },
  selectedCell: { backgroundColor: "#1E2A24" },
  hijriDay: { color: colors.text, fontWeight: "900", fontSize: 18 },
  gregorianDate: { color: colors.muted, fontSize: 9, marginTop: 4, fontWeight: "600" },
  selectedText: { color: "#FFF" },
  selectedSubText: { color: "#D8DDD9" },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 4 },
  todayDotSelected: { backgroundColor: "#F5D35B" },
  detailCard: { width: "100%", backgroundColor: "#F7F2E4", borderRadius: 22, padding: 22, borderWidth: 1, borderColor: "#E9DFC4" },
  detailEyebrow: { color: "#927817", fontSize: 10, letterSpacing: 1.1, fontWeight: "900" },
  detailDay: { color: "#1E2A24", fontSize: 58, lineHeight: 64, fontWeight: "900", marginTop: 10 },
  detailMonth: { color: "#1E2A24", fontSize: 17, lineHeight: 24, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#DED3B8", marginVertical: 20 },
  gregorianLabel: { color: "#80765F", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: .7 },
  gregorianFull: { color: "#302E28", fontSize: 16, lineHeight: 23, fontWeight: "700", marginTop: 6 },
  sourceNote: { color: "#80765F", fontSize: 12, lineHeight: 18, marginTop: 18 },
  detailCardWide: { width: 310 },
  errorCard: { backgroundColor: "#FFF3F1", borderColor: "#F0CCC7", borderWidth: 1, borderRadius: 18, padding: spacing.md, marginBottom: spacing.md },
  errorTitle: { color: "#9F3029", fontWeight: "900", fontSize: 16 },
  errorText: { color: "#7C4E49", marginTop: 5, lineHeight: 19 },
  retryButton: { alignSelf: "flex-start", backgroundColor: "#9F3029", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, marginTop: 12 },
  retryText: { color: "#FFF", fontWeight: "800" }
});
