import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { fmbApi } from "../../api/fmbApi";
import { colors, spacing } from "../../theme";
import Card from "../Card";
import Button from "../Button";
import DatePickerField, { localDateValue, transactionDateToIso } from "../DatePickerField";
import { Empty, MenuContent, Notice, formatDay, formatTime, prettyLabel, ui } from "./FmbUi";

const metrics = (data, names) => <View style={ui.statGrid}>{names.map(([key, label]) => <View key={key} style={[ui.stat, { flexBasis: 160, padding: spacing.md }]}><Text style={ui.label}>{label || prettyLabel(key)}</Text><Text style={[ui.statValue, { fontSize: 23 }]}>{data?.[key] ?? "—"}</Text></View>)}</View>;
export default function FmbSummaryPanel() {
  const today = localDateValue();
  const [date, setDate] = useState(today);
  const [fromDate, setFrom] = useState(today);
  const [toDate, setTo] = useState(localDateValue(new Date(Date.now() + 6 * 86400000)));
  const [query, setQuery] = useState({ date, fromDate, toDate });
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setData(null);
    fmbApi.getSummary(Object.fromEntries(Object.entries(query).map(([key, value]) => [key, transactionDateToIso(value)]))).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message || "Unable to load FMB summary."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, revision]);
  function apply() {
    if (toDate < fromDate) { setError("Range end date cannot be before range start date."); return; }
    setQuery({ date, fromDate, toDate }); setRevision(value => value + 1);
  }
  return <View>
    <View style={ui.heading}><View><Text style={ui.title}>FMB summary</Text><Text style={ui.meta}>Plan daily servings and follow your Jamaat’s Thali activity.</Text></View></View>
    <Card><View style={ui.filters}><View style={ui.filter}><DatePickerField label="Serving date" value={date} onChange={setDate} /></View><View style={ui.filter}><DatePickerField label="Range from" value={fromDate} onChange={setFrom} /></View><View style={ui.filter}><DatePickerField label="Range to" value={toDate} onChange={setTo} /></View><Button title="Apply" onPress={apply} disabled={loading} style={{ marginBottom: spacing.md }} /></View></Card>
    <Notice error>{error}</Notice>{error && !data ? <Button title="Retry summary" variant="outline" onPress={() => setRevision(v => v + 1)} /> : null}
    {loading ? <ActivityIndicator color={colors.primary} /> : data ? <View>
      <Text style={[ui.name, { marginBottom: spacing.md }]}>Serving plan · {formatDay(data.asOfDate || query.date)}</Text>
      <View style={ui.statGrid}>{[["registeredThaalis", "Registered Thalis"], ["pausedThaalis", "Paused for the day"], ["expectedThaalis", "Thalis to prepare"]].map(([key, label]) => <View key={key} style={[ui.stat, key === "expectedThaalis" && { backgroundColor: colors.primarySoft, borderColor: colors.primarySoftStrong }]}><Text style={ui.name}>{label}</Text><Text style={ui.statValue}>{data.thaali?.[key] ?? "—"}</Text><Text style={ui.meta}>{key === "expectedThaalis" ? "Expected servings after pauses" : key === "pausedThaalis" ? "Paused on the selected date" : "Registered on the selected date"}</Text></View>)}</View>
      {(data.alerts || []).map((alert, i) => <Notice key={alert.code || i}>{alert.message}</Notice>)}
      <Card><Text style={[ui.title, { marginBottom: spacing.md }]}>Members & families</Text>{metrics(data.thaali, [["totalMumineen", "Total Mumineen"], ["totalFamilies", "Total families"], ["notTakingMumineen", "Not taking Thali"], ["registeredFamilies", "Registered families"], ["fullyPausedFamilies", "Fully paused families"], ["partiallyPausedFamilies", "Partially paused families"], ["expectedFamilies", "Families to serve"], ["notTakingFamilies", "Families not taking"], ["familiesWithMultipleThaalis", "Families with multiple Thalis"]])}</Card>
      <Card><Text style={ui.title}>Activity in selected range</Text><Text style={[ui.meta, { marginBottom: spacing.md }]}>{formatDay(data.fromDate || query.fromDate)} – {formatDay(data.toDate || query.toDate)}</Text>{metrics(data.movement, [["thaaliStarted", "Thalis started"], ["thaaliStopped", "Thalis stopped"], ["thaaliAutoStopped", "Automatically stopped"], ["pausesRequested", "Pauses requested"], ["pausesCutShort", "Resumed early"], ["pausesCancelled", "Pauses cancelled"]])}</Card>
      <Card><Text style={[ui.title, { marginBottom: spacing.md }]}>Coming up</Text>{metrics(data.upcoming, [["thaaliStartingNext7Days", "Starting in next 7 days"], ["thaaliEndingNext7Days", "Ending in next 7 days"], ["pausesStartingTomorrow", "Pausing tomorrow"], ["pausesEndingNext3Days", "Pauses ending in 3 days"]])}</Card>
      <Card><Text style={[ui.title, { marginBottom: spacing.md }]}>Daily serving trend</Text>{metrics(data.trendTotals, [["days", "Days"], ["thaaliDaysRegistered", "Registered Thali-days"], ["thaaliDaysPaused", "Paused Thali-days"], ["thaaliDaysExpected", "Expected Thali-days"], ["averageExpectedPerDay", "Average per day"], ["minExpected", "Minimum servings"], ["maxExpected", "Maximum servings"]])}
        {(data.trend || []).map(item => <View key={item.date} style={[ui.heading, { borderBottomWidth: 1, borderColor: colors.border, paddingBottom: spacing.sm }]}><Text style={ui.name}>{formatDay(item.date)}</Text><Text style={ui.meta}>{item.registeredThaalis} registered · {item.pausedThaalis} paused · {item.expectedFamilies} families</Text><Text style={ui.name}>{item.expectedThaalis} to prepare</Text></View>)}
      </Card>
      <Card><Text style={[ui.title, { marginBottom: spacing.md }]}>Sector breakdown</Text>{(data.sectors || []).length ? data.sectors.map((item, i) => <View key={item.sector || i} style={ui.heading}><View style={ui.flex}><Text style={ui.name}>{item.sector || "Unassigned sector"}</Text><Text style={ui.meta}>{item.registeredThaalis} registered · {item.pausedThaalis} paused · {item.registeredFamilies} registered families</Text></View><View><Text style={ui.name}>{item.expectedThaalis} Thalis</Text><Text style={ui.meta}>{item.expectedFamilies} families to serve</Text></View></View>) : <Empty title="No sector data" />}</Card>
      <Card><Text style={[ui.title, { marginBottom: spacing.md }]}>Menu coverage</Text>{metrics(data.menu, [["menusInRange", "Dates with menus"], ["daysWithoutMenuInRange", "Dates without menus"]])}
        <Text style={ui.name}>Menu for {formatDay(data.asOfDate || query.date)}</Text>{data.menu?.menuForDate ? <MenuContent value={data.menu.menuForDate.menuJson} /> : <Text style={ui.meta}>No menu published for this date.</Text>}
        {data.menu?.menuForNextDay ? <View style={{ marginTop: spacing.md }}><Text style={ui.name}>Next day · {formatDay(data.menu.menuForNextDay.menuDate)}</Text><MenuContent value={data.menu.menuForNextDay.menuJson} /></View> : null}
        {data.menu?.upcomingMenus?.length ? <View style={{ marginTop: spacing.md }}><Text style={ui.name}>Upcoming menus</Text>{data.menu.upcomingMenus.map(menu => <View key={menu.menuId} style={{ marginTop: spacing.sm }}><Text style={ui.label}>{formatDay(menu.menuDate)}</Text><MenuContent value={menu.menuJson} /></View>)}</View> : null}
        {data.menu?.missingMenuDates?.length ? <Text style={[ui.meta, { marginTop: spacing.md }]}>Missing menus: {data.menu.missingMenuDates.map(formatDay).join(", ")}</Text> : null}
        {data.menu?.lastMenuChange ? <Text style={[ui.meta, { marginTop: spacing.md }]}>Last menu change: {data.menu.lastMenuChange.performedByName || "Unknown user"} · {formatDay(data.menu.lastMenuChange.menuDate)} · {formatTime(data.menu.lastMenuChange.performedAt)}</Text> : null}
      </Card>
    </View> : !error ? <Empty title="No summary available" /> : null}
  </View>;
}
