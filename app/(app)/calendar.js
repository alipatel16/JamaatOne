import React, { useEffect, useMemo, useState } from "react";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const today = new Date();

  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().slice(0, 10)
  );
  const [calendar, setCalendar] = useState(null);
  const [details, setDetails] = useState(null);
  const [mode, setMode] = useState("CALENDAR");
  const [error, setError] = useState("");

  useEffect(() => {
    loadMonth();
  }, [cursor]);

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate]);

  async function loadMonth() {
    try {
      setError("");
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const result = await apiRequest(
        `${endpoints.calendar}?year=${year}&month=${month}`
      );
      setCalendar(result);

      const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
      if (!selectedDate.startsWith(monthPrefix) && result.days?.length) {
        setSelectedDate(result.days[0].gregorianDate);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadDay(date) {
    try {
      setDetails(
        await apiRequest(`${endpoints.calendarDay}?date=${date}`)
      );
    } catch (e) {
      setError(e.message);
    }
  }

  function changeMonth(amount) {
    setCursor(
      current =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  }

  const cells = useMemo(() => {
    if (!calendar) return [];
    return [
      ...Array.from({ length: calendar.firstWeekday }, () => null),
      ...calendar.days
    ];
  }, [calendar]);

  const eventDays = useMemo(
    () => calendar?.days?.filter(day => day.hasEvent) || [],
    [calendar]
  );

  if (!calendar && !error) return <LoadingView />;

  return (
    <Screen>
      <View style={[styles.header, isWide && styles.headerWide]}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>DAWOODI BOHRA CALENDAR</Text>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>
            Gregorian dates, approved Hijri dates, namaaz summary, and
            Jamaat announcements in one place.
          </Text>
        </View>

        <View style={styles.monthNavigation}>
          <Pressable onPress={() => changeMonth(-1)} style={styles.navButton}>
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <View style={styles.monthNameBlock}>
            <Text style={styles.hijriMonth}>
              {calendar?.hijriMonthName} {calendar?.hijriYear}
            </Text>
            <Text style={styles.gregorianMonth}>
              {calendar?.monthName} {calendar?.year}
            </Text>
          </View>
          <Pressable onPress={() => changeMonth(1)} style={styles.navButton}>
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.modeSwitch}>
        {[
          { label: "Calendar", value: "CALENDAR" },
          { label: `Events (${eventDays.length})`, value: "EVENTS" }
        ].map(item => (
          <Pressable
            key={item.value}
            onPress={() => setMode(item.value)}
            style={[
              styles.modeButton,
              mode === item.value && styles.modeButtonActive
            ]}
          >
            <Text
              style={[
                styles.modeText,
                mode === item.value && styles.modeTextActive
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode === "CALENDAR" ? (
        <View style={[styles.contentLayout, isWide && styles.contentLayoutWide]}>
          <View style={styles.calendarPanel}>
            <View style={styles.weekdays}>
              {WEEKDAYS.map(day => (
                <Text key={day} style={styles.weekday}>
                  {isWide ? day : day[0]}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (!day) {
                  return <View key={`blank-${index}`} style={styles.dayCell} />;
                }

                const selected = day.gregorianDate === selectedDate;
                return (
                  <Pressable
                    key={day.gregorianDate}
                    onPress={() => setSelectedDate(day.gregorianDate)}
                    style={[
                      styles.dayCell,
                      selected && styles.selectedCell,
                      day.isToday && styles.todayCell
                    ]}
                  >
                    <View style={styles.dayTopRow}>
                      <Text
                        style={[
                          styles.gregorianDay,
                          selected && styles.selectedPrimaryText
                        ]}
                      >
                        {day.gregorianDay}
                      </Text>
                      {day.hasEvent ? <View style={styles.eventDot} /> : null}
                    </View>

                    <Text
                      style={[
                        styles.hijriDay,
                        selected && styles.selectedPrimaryText
                      ]}
                    >
                      {day.hijriDay}
                    </Text>

                    {isWide ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.dayCaption,
                          selected && styles.selectedSecondaryText
                        ]}
                      >
                        {day.hasEvent ? "Event scheduled" : "No events"}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.detailsPanel}>
            <SelectedDayPanel details={details} />
          </View>
        </View>
      ) : (
        <View style={[styles.eventsGrid, isWide && styles.eventsGridWide]}>
          {eventDays.map(day => (
            <Pressable
              key={day.gregorianDate}
              onPress={() => {
                setSelectedDate(day.gregorianDate);
                setMode("CALENDAR");
              }}
              style={[styles.eventDateCard, isWide && styles.eventDateCardWide]}
            >
              <Text style={styles.eventDateNumber}>{day.gregorianDay}</Text>
              <Text style={styles.eventDateMonth}>{calendar.monthName}</Text>
              <Text style={styles.eventDateHijri}>
                Hijri {day.hijriDay}
              </Text>
            </Pressable>
          ))}

          {!eventDays.length ? (
            <Card>
              <Text style={styles.emptyText}>
                No announcements or calendar events in this month.
              </Text>
            </Card>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function SelectedDayPanel({ details }) {
  if (!details) {
    return (
      <Card>
        <Text style={styles.emptyText}>Select a date to view details.</Text>
      </Card>
    );
  }

  return (
    <>
      <Card style={styles.selectedSummary}>
        <Text style={styles.selectedEyebrow}>SELECTED DATE</Text>
        <Text style={styles.selectedTitle}>
          {details.dayName}, {details.hijriDate}
        </Text>

        <View style={styles.prayerRow}>
          <PrayerStat label="Sunrise" value={details.prayerSummary.sunrise} />
          <PrayerStat label="Zawal" value={details.prayerSummary.zawal} />
          <PrayerStat label="Maghrib" value={details.prayerSummary.maghrib} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Announcements and events</Text>

      {!details.announcements.length ? (
        <Card>
          <Text style={styles.emptyText}>
            No announcements or events for this date.
          </Text>
        </Card>
      ) : null}

      {details.announcements.map(item => (
        <Card key={item.id}>
          <View style={styles.eventHeader}>
            <View style={styles.eventTypeBadge}>
              <Text style={styles.eventTypeText}>{item.type}</Text>
            </View>
            <Text style={styles.eventTitle}>{item.title}</Text>
          </View>

          <Text style={styles.eventBody}>{item.body}</Text>

          {item.location ? (
            <Text style={styles.eventLocation}>@ {item.location}</Text>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function PrayerStat({ label, value }) {
  return (
    <View style={styles.prayerStat}>
      <Text style={styles.prayerLabel}>{label}</Text>
      <Text style={styles.prayerValue}>{value}</Text>
    </View>
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
    flex: 1,
    maxWidth: 620
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
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.sm,
    marginTop: spacing.md
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  navText: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 30
  },
  monthNameBlock: {
    minWidth: 220,
    paddingHorizontal: spacing.md
  },
  hijriMonth: {
    color: colors.text,
    fontWeight: "900",
    textAlign: "center"
  },
  gregorianMonth: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 3
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.lg
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: 9
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
  contentLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  calendarPanel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden"
  },
  detailsPanel: {
    flex: 0.8,
    marginTop: spacing.lg
  },
  weekdays: {
    flexDirection: "row",
    backgroundColor: colors.primary
  },
  weekday: {
    width: "14.2857%",
    color: "#FFFFFF",
    textAlign: "center",
    paddingVertical: spacing.sm,
    fontWeight: "800",
    fontSize: 12
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  dayCell: {
    width: "14.2857%",
    minHeight: 72,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 7,
    backgroundColor: colors.surface
  },
  selectedCell: {
    backgroundColor: colors.primary
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.accent
  },
  dayTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  gregorianDay: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13
  },
  hijriDay: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 8
  },
  dayCaption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 8
  },
  selectedPrimaryText: {
    color: "#FFFFFF"
  },
  selectedSecondaryText: {
    color: "#DDEBE7"
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent
  },
  selectedSummary: {
    backgroundColor: colors.primary
  },
  selectedEyebrow: {
    color: "#DDEBE7",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1
  },
  selectedTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 5
  },
  prayerRow: {
    flexDirection: "row",
    marginTop: spacing.lg
  },
  prayerStat: {
    flex: 1
  },
  prayerLabel: {
    color: "#DDEBE7",
    fontSize: 12
  },
  prayerValue: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: spacing.sm
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  eventTypeBadge: {
    backgroundColor: "#FFF6D6",
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.sm
  },
  eventTypeText: {
    color: "#8B6C00",
    fontSize: 11,
    fontWeight: "800"
  },
  eventTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  eventBody: {
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  eventLocation: {
    color: colors.muted,
    marginTop: spacing.sm
  },
  eventsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4
  },
  eventsGridWide: {
    marginHorizontal: -6
  },
  eventDateCard: {
    width: "48%",
    margin: "1%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md
  },
  eventDateCardWide: {
    width: "23.5%",
    margin: "0.75%"
  },
  eventDateNumber: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: "900"
  },
  eventDateMonth: {
    color: colors.text,
    fontWeight: "800"
  },
  eventDateHijri: {
    color: colors.muted,
    marginTop: 4
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center"
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  }
});
