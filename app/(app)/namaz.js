import React, { useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Card from "../../src/components/Card";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import { colors, spacing } from "../../src/theme";

const GROUP_LABELS = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening"
};

export default function NamazScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [mode, setMode] = useState("DAY");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [result, setResult] = useState(null);
  const [monthResult, setMonthResult] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPrayerTimes();
  }, [selectedDate]);

  useEffect(() => {
    if (mode === "MONTH") {
      loadMonth();
    }
  }, [mode, selectedDate]);

  async function getCoordinates() {
    let latitude = 23.122;
    let longitude = 72.049;

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status === "granted") {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
    }

    return { latitude, longitude };
  }

  async function loadPrayerTimes() {
    try {
      setError("");
      const { latitude, longitude } = await getCoordinates();
      const query =
        `?latitude=${latitude}&longitude=${longitude}&date=${selectedDate}`;
      setResult(await apiRequest(`${endpoints.prayerTimes}${query}`));
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadMonth() {
    try {
      const { latitude, longitude } = await getCoordinates();
      const date = new Date(`${selectedDate}T12:00:00`);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const query =
        `?latitude=${latitude}&longitude=${longitude}&year=${year}&month=${month}`;
      const response = await apiRequest(
        `${endpoints.prayerTimes}/month${query}`
      );
      setMonthResult(response.days || []);
    } catch (e) {
      setError(e.message);
    }
  }

  function changeDate(days) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().slice(0, 10));
  }

  const grouped = useMemo(() => {
    const items = result?.items || [];
    return ["MORNING", "AFTERNOON", "EVENING"].map(group => ({
      group,
      items: items.filter(item => item.group === group)
    }));
  }, [result]);

  if (!result && !error) return <LoadingView />;

  return (
    <Screen>
      <View style={[styles.header, isWide && styles.headerWide]}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>PRAYER SCHEDULE</Text>
          <Text style={styles.title}>Namaaz timings</Text>
          <Text style={styles.subtitle}>
            Based on your current location and selected date.
          </Text>
        </View>

        <View style={styles.locationBadge}>
          <Text style={styles.locationLabel}>Location</Text>
          <Text style={styles.locationValue}>
            {result?.locationName || "Current location"}
          </Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.modeSwitch}>
          {["DAY", "MONTH"].map(item => (
            <Pressable
              key={item}
              onPress={() => setMode(item)}
              style={[
                styles.modeButton,
                mode === item && styles.modeButtonActive
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === item && styles.modeTextActive
                ]}
              >
                {item === "DAY" ? "Day view" : "Month view"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.dateNavigation}>
          <Pressable onPress={() => changeDate(-1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <View style={styles.dateBlock}>
            <Text style={styles.datePrimary}>
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                "en-IN",
                { weekday: "long", day: "numeric", month: "long" }
              )}
            </Text>
            <Text style={styles.dateSecondary}>{selectedDate}</Text>
          </View>
          <Pressable onPress={() => changeDate(1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode === "DAY" ? (
        <View style={[styles.dayLayout, isWide && styles.dayLayoutWide]}>
          <Card style={[styles.summaryCard, isWide && styles.summaryCardWide]}>
            <Text style={styles.cardEyebrow}>TODAY AT A GLANCE</Text>
            <Text style={styles.summaryTitle}>
              {result?.items?.find(item => item.highlighted)?.name || "Asr End"}
            </Text>
            <Text style={styles.summaryTime}>
              {result?.items?.find(item => item.highlighted)?.time || "--:--"}
            </Text>
            <Text style={styles.summaryHint}>
              Highlighted timing updates automatically with backend data.
            </Text>
          </Card>

          <View style={styles.groupsContainer}>
            {grouped.map(section => (
              <View
                key={section.group}
                style={[
                  styles.groupSection,
                  isWide && styles.groupSectionWide
                ]}
              >
                <Text style={styles.groupTitle}>
                  {GROUP_LABELS[section.group]}
                </Text>

                {section.items.map(item => (
                  <Card
                    key={item.name}
                    style={[
                      styles.timingCard,
                      item.highlighted && styles.highlightedCard
                    ]}
                  >
                    <View>
                      <Text
                        style={[
                          styles.timingName,
                          item.highlighted && styles.highlightedText
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.timingCaption,
                          item.highlighted && styles.highlightedCaption
                        ]}
                      >
                        {section.group === "MORNING"
                          ? "Morning period"
                          : section.group === "AFTERNOON"
                            ? "Daytime period"
                            : "Evening period"}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.time,
                        item.highlighted && styles.highlightedText
                      ]}
                    >
                      {item.time}
                    </Text>
                  </Card>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.monthContainer}>
          <Text style={styles.sectionTitle}>Monthly namaaz schedule</Text>
          <Text style={styles.sectionSubtitle}>
            Scroll through daily timings for the selected month.
          </Text>

          <View style={styles.monthHeader}>
            <Text style={[styles.monthCell, styles.dateColumn]}>Date</Text>
            <Text style={styles.monthCell}>Sihori</Text>
            <Text style={styles.monthCell}>Sunrise</Text>
            <Text style={styles.monthCell}>Zawal</Text>
            <Text style={styles.monthCell}>Maghrib</Text>
          </View>

          {monthResult.map(day => (
            <Pressable
              key={day.date}
              onPress={() => {
                setSelectedDate(day.date);
                setMode("DAY");
              }}
              style={styles.monthRow}
            >
              <Text style={[styles.monthCell, styles.dateColumn]}>
                {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                  "en-IN",
                  { day: "2-digit", month: "short" }
                )}
              </Text>
              <Text style={styles.monthCell}>{day.sihoriEnd}</Text>
              <Text style={styles.monthCell}>{day.sunrise}</Text>
              <Text style={styles.monthCell}>{day.zawal}</Text>
              <Text style={styles.monthCell}>{day.maghrib}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg
  },
  headerWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerText: {
    flex: 1
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: colors.muted,
    marginTop: 6,
    lineHeight: 20
  },
  locationBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 180
  },
  locationLabel: {
    color: colors.muted,
    fontSize: 12
  },
  locationValue: {
    color: colors.primary,
    fontWeight: "800",
    marginTop: 3
  },
  toolbar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.lg
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 4
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: 8
  },
  modeButtonActive: {
    backgroundColor: colors.primary
  },
  modeText: {
    color: colors.muted,
    fontWeight: "700"
  },
  modeTextActive: {
    color: "#FFFFFF"
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  navButtonText: {
    fontSize: 28,
    color: colors.primary,
    lineHeight: 30
  },
  dateBlock: {
    flex: 1,
    alignItems: "center"
  },
  datePrimary: {
    color: colors.text,
    fontWeight: "800"
  },
  dateSecondary: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  dayLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  summaryCard: {
    backgroundColor: colors.primary
  },
  summaryCardWide: {
    width: 280,
    marginRight: spacing.lg
  },
  cardEyebrow: {
    color: "#DDEBE7",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.lg
  },
  summaryTime: {
    color: colors.accent,
    fontSize: 42,
    fontWeight: "900",
    marginTop: 4
  },
  summaryHint: {
    color: "#DDEBE7",
    lineHeight: 20,
    marginTop: spacing.md
  },
  groupsContainer: {
    flex: 1
  },
  groupSection: {
    marginBottom: spacing.lg
  },
  groupSectionWide: {
    marginBottom: spacing.md
  },
  groupTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  timingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  highlightedCard: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  timingName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  timingCaption: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 12
  },
  highlightedText: {
    color: "#FFFFFF"
  },
  highlightedCaption: {
    color: "#FFF8DD"
  },
  time: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: "900"
  },
  monthContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md
  },
  sectionSubtitle: {
    color: colors.muted,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: spacing.md
  },
  monthHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm
  },
  monthRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  monthCell: {
    flex: 1,
    textAlign: "center",
    color: colors.text,
    fontSize: 12
  },
  dateColumn: {
    flex: 1.2,
    fontWeight: "800"
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  }
});
