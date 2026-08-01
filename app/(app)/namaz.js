import React, { useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import Screen from "../../src/components/Screen";
import LoadingView from "../../src/components/LoadingView";
import { colors, spacing } from "../../src/theme";
import { cleanPrayerTime, fromIsoDate, getPrayerCalendar, getPrayerTimes, toIsoDate } from "../../src/services/islamicData";

const PRAYER_DEFINITIONS = [
  { key: "Imsak", name: "Sihori End", group: "MORNING" },
  { key: "Fajr", name: "Fajr", group: "MORNING" },
  { key: "Sunrise", name: "Sunrise", group: "MORNING" },
  { key: "Dhuhr", name: "Zawal", group: "AFTERNOON" },
  { key: "Asr", name: "Asr", group: "AFTERNOON" },
  { key: "Maghrib", name: "Maghrib", group: "EVENING" },
  { key: "Isha", name: "Isha", group: "EVENING" },
  { key: "Midnight", name: "Nisf Ul Layl", group: "EVENING" }
];

const GROUP_LABELS = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening"
};

function timeToMinutes(value) {
  const clean = cleanPrayerTime(value);
  const [hours, minutes] = clean.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

function getNearestPrayer(items, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let nearest = null;
  let smallestDifference = Infinity;

  items.forEach(item => {
    const target = timeToMinutes(item.time);
    if (target == null) return;
    const difference = Math.min(
      Math.abs(target - nowMinutes),
      Math.abs(target + 1440 - nowMinutes),
      Math.abs(target - 1440 - nowMinutes)
    );
    if (difference < smallestDifference) {
      smallestDifference = difference;
      nearest = item;
    }
  });

  return nearest;
}

export default function NamazScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState("Current location");
  const [result, setResult] = useState(null);
  const [monthDays, setMonthDays] = useState([]);
  const [mode, setMode] = useState("DAY");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!location) return;
    loadDay();
  }, [location, selectedDate]);

  useEffect(() => {
    if (!location || mode !== "MONTH") return;
    loadMonth();
  }, [location, mode, selectedDate]);

  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  async function requestLocation() {
    try {
      setLoading(true);
      setError("");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocation(null);
        setError("Location permission is required to calculate prayer timings for your actual location.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      };
      setLocation(coords);

      try {
        const places = await Location.reverseGeocodeAsync(coords);
        const place = places?.[0];
        if (place) {
          setLocationName([place.city || place.subregion, place.region].filter(Boolean).join(", ") || "Current location");
        }
      } catch {
        setLocationName("Current location");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDay() {
    try {
      setLoading(true);
      setError("");
      const data = await getPrayerTimes({
        ...location,
        date: fromIsoDate(selectedDate)
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonth() {
    try {
      const date = fromIsoDate(selectedDate);
      const data = await getPrayerCalendar({
        ...location,
        year: date.getFullYear(),
        month: date.getMonth() + 1
      });
      setMonthDays(data || []);
    } catch (e) {
      setError(e.message);
      setMonthDays([]);
    }
  }

  function changeDate(days) {
    const date = fromIsoDate(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(toIsoDate(date));
  }

  const prayerItems = useMemo(() => {
    if (!result?.timings) return [];
    return PRAYER_DEFINITIONS.map(item => ({
      ...item,
      time: cleanPrayerTime(result.timings[item.key])
    }));
  }, [result]);

  const nearest = useMemo(() => {
    if (selectedDate !== toIsoDate(new Date())) return null;
    return getNearestPrayer(prayerItems, new Date(clockTick));
  }, [prayerItems, selectedDate, clockTick]);

  const grouped = useMemo(
    () => ["MORNING", "AFTERNOON", "EVENING"].map(group => ({
      group,
      items: prayerItems.filter(item => item.group === group)
    })),
    [prayerItems]
  );

  if (loading && !result && !error) return <LoadingView />;

  return (
    <Screen>
      <View style={[styles.hero, isWide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>LOCATION-BASED NAMAAZ</Text>
          <Text style={styles.title}>Timings that move with you.</Text>
          <Text style={styles.subtitle}>
            The frontend uses your device location, loads real timings, and decides the nearest timing from the current clock itself.
          </Text>
        </View>

        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>YOUR LOCATION</Text>
          <Text style={styles.locationValue}>{locationName}</Text>
          {location ? (
            <Text style={styles.coordinates}>
              {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
            </Text>
          ) : null}
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>We need your location</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.permissionButton} onPress={requestLocation}>
            <Text style={styles.permissionText}>Allow location</Text>
          </Pressable>
        </View>
      ) : null}

      {result ? (
        <>
          <View style={styles.toolbar}>
            <View style={styles.segmented}>
              {["DAY", "MONTH"].map(item => (
                <Pressable key={item} onPress={() => setMode(item)} style={[styles.segment, mode === item && styles.segmentActive]}>
                  <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>{item === "DAY" ? "Day" : "Month"}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.dateNavigator}>
              <Pressable style={styles.dateButton} onPress={() => changeDate(-1)}><Text style={styles.dateButtonText}>‹</Text></Pressable>
              <View style={styles.dateTextWrap}>
                <Text style={styles.datePrimary}>{fromIsoDate(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}</Text>
                <Text style={styles.dateSecondary}>{result?.date?.hijri?.date ? `${result.date.hijri.date} H` : selectedDate}</Text>
              </View>
              <Pressable style={styles.dateButton} onPress={() => changeDate(1)}><Text style={styles.dateButtonText}>›</Text></Pressable>
            </View>
          </View>

          {mode === "DAY" ? (
            <View style={[styles.contentLayout, isWide && styles.contentLayoutWide]}>
              <View style={[styles.nowCard, isWide && styles.nowCardWide]}>
                <Text style={styles.nowEyebrow}>{nearest ? "NEAREST TO CURRENT TIME" : "SELECTED DATE"}</Text>
                <Text style={styles.nowPrayer}>{nearest?.name || "Prayer schedule"}</Text>
                <Text style={styles.nowTime}>{nearest?.time || result?.date?.readable || "—"}</Text>
                {nearest ? (
                  <Text style={styles.nowHint}>Highlighted below based on your device time, not a backend status flag.</Text>
                ) : (
                  <Text style={styles.nowHint}>Nearest-time highlighting is shown only for today.</Text>
                )}
              </View>

              <View style={styles.groupList}>
                {grouped.map(section => (
                  <View key={section.group} style={styles.groupSection}>
                    <Text style={styles.groupTitle}>{GROUP_LABELS[section.group]}</Text>
                    {section.items.map(item => {
                      const active = nearest?.key === item.key;
                      return (
                        <View key={item.key} style={[styles.prayerCard, active && styles.prayerCardActive]}>
                          <View>
                            <Text style={[styles.prayerName, active && styles.prayerNameActive]}>{item.name}</Text>
                            <Text style={[styles.prayerMeta, active && styles.prayerMetaActive]}>{active ? "Nearest now" : GROUP_LABELS[item.group]}</Text>
                          </View>
                          <Text style={[styles.prayerTime, active && styles.prayerTimeActive]}>{item.time}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.monthCard}>
              <Text style={styles.monthTitle}>Monthly prayer timings</Text>
              <Text style={styles.monthSubtitle}>Live monthly values for the same device location.</Text>
              <View style={styles.monthHeader}>
                <Text style={[styles.monthCell, styles.monthDate]}>Date</Text>
                <Text style={styles.monthCell}>Fajr</Text>
                <Text style={styles.monthCell}>Sunrise</Text>
                <Text style={styles.monthCell}>Asr</Text>
                <Text style={styles.monthCell}>Maghrib</Text>
              </View>
              {monthDays.map(day => (
                <Pressable
                  key={day.date.gregorian.date}
                  style={styles.monthRow}
                  onPress={() => {
                    const [dd, mm, yyyy] = day.date.gregorian.date.split("-");
                    setSelectedDate(`${yyyy}-${mm}-${dd}`);
                    setMode("DAY");
                  }}
                >
                  <Text style={[styles.monthCell, styles.monthDate]}>{day.date.gregorian.day} {day.date.gregorian.month.en.slice(0, 3)}</Text>
                  <Text style={styles.monthCell}>{cleanPrayerTime(day.timings.Fajr)}</Text>
                  <Text style={styles.monthCell}>{cleanPrayerTime(day.timings.Sunrise)}</Text>
                  <Text style={styles.monthCell}>{cleanPrayerTime(day.timings.Asr)}</Text>
                  <Text style={styles.monthCell}>{cleanPrayerTime(day.timings.Maghrib)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.lg },
  heroWide: { flexDirection: "row", gap: 26, alignItems: "flex-end", justifyContent: "space-between" },
  heroCopy: { flex: 1, maxWidth: 640 },
  eyebrow: { color: colors.accent, fontWeight: "900", fontSize: 11, letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: "900", marginTop: 7 },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 8, maxWidth: 610 },
  locationCard: { marginTop: spacing.lg, minWidth: 230, backgroundColor: "#EEF4F0", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#D9E4DD" },
  locationLabel: { color: "#64806D", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  locationValue: { color: "#1D3325", fontWeight: "900", fontSize: 16, marginTop: 5 },
  coordinates: { color: "#718078", fontSize: 11, marginTop: 3 },
  errorCard: { backgroundColor: "#FFF3F1", borderColor: "#F0CCC7", borderWidth: 1, borderRadius: 18, padding: spacing.md, marginBottom: spacing.md },
  errorTitle: { color: "#9F3029", fontWeight: "900", fontSize: 16 },
  errorText: { color: "#7C4E49", marginTop: 5, lineHeight: 19 },
  permissionButton: { alignSelf: "flex-start", backgroundColor: "#9F3029", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, marginTop: 12 },
  permissionText: { color: "#FFF", fontWeight: "800" },
  toolbar: { gap: 12, marginBottom: spacing.md },
  segmented: { flexDirection: "row", alignSelf: "flex-start", backgroundColor: "#ECEAE5", borderRadius: 13, padding: 4 },
  segment: { minWidth: 76, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, alignItems: "center" },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  segmentTextActive: { color: colors.text },
  dateNavigator: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 7 },
  dateButton: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  dateButtonText: { color: colors.text, fontSize: 27, lineHeight: 29 },
  dateTextWrap: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  datePrimary: { color: colors.text, fontSize: 14, fontWeight: "900", textAlign: "center" },
  dateSecondary: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: "center" },
  contentLayout: { gap: spacing.md },
  contentLayoutWide: { flexDirection: "row", alignItems: "flex-start" },
  nowCard: { backgroundColor: "#1F2D27", borderRadius: 22, padding: 22 },
  nowCardWide: { width: 300 },
  nowEyebrow: { color: "#DCCB82", fontSize: 10, letterSpacing: 1.1, fontWeight: "900" },
  nowPrayer: { color: "#FFF", fontSize: 25, fontWeight: "900", marginTop: 12 },
  nowTime: { color: "#F0D467", fontSize: 42, lineHeight: 48, fontWeight: "900", marginTop: 5 },
  nowHint: { color: "#C9D0CC", lineHeight: 19, fontSize: 12, marginTop: 16 },
  groupList: { flex: 1, gap: 18 },
  groupSection: { gap: 9 },
  groupTitle: { color: colors.muted, textTransform: "uppercase", letterSpacing: .8, fontSize: 11, fontWeight: "900", marginLeft: 2 },
  prayerCard: { minHeight: 72, borderRadius: 18, paddingHorizontal: 17, paddingVertical: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  prayerCardActive: { backgroundColor: "#FFF4C4", borderColor: "#E1C45A" },
  prayerName: { color: colors.text, fontWeight: "900", fontSize: 16 },
  prayerNameActive: { color: "#3E3513" },
  prayerMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  prayerMetaActive: { color: "#8A772C", fontWeight: "700" },
  prayerTime: { color: colors.text, fontSize: 22, fontWeight: "900" },
  prayerTimeActive: { color: "#6F5900" },
  monthCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 14, overflow: "hidden" },
  monthTitle: { color: colors.text, fontWeight: "900", fontSize: 18 },
  monthSubtitle: { color: colors.muted, marginTop: 4, marginBottom: 14, fontSize: 12 },
  monthHeader: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  monthRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  monthCell: { flex: 1, textAlign: "center", color: colors.text, fontSize: 11 },
  monthDate: { flex: 1.25, textAlign: "left", paddingLeft: 6, fontWeight: "800" }
});
