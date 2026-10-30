import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Redirect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Screen from "../../src/components/Screen";
import ThaaliPanel from "../../src/components/ThaaliPanel";
import FmbSummaryPanel from "../../src/components/fmb/FmbSummaryPanel";
import FmbMenusPanel from "../../src/components/fmb/FmbMenusPanel";
import FmbPausesPanel from "../../src/components/fmb/FmbPausesPanel";
import FmbRequestWindowPanel from "../../src/components/fmb/FmbRequestWindowPanel";
import { canAccessFmb, canEditFmb, isAamil, isFmbUser, isFmbAdmin } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radius, spacing } from "../../src/theme";

export default function FmbScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const manager = isAamil(user) || isFmbUser(user) || isFmbAdmin(user);
  const canEdit = canEditFmb(user);
  const scope = `${user?.userId}-${manager}-${canEdit}`;
  const [selected, setSelected] = useState(null);
  if (!canAccessFmb(user)) return <Redirect href="/(app)" />;
  const tabs = manager ? [["SUMMARY", "Summary", "view-dashboard-outline"], ["THALI", "Thali Members", "account-group-outline"], ["PAUSES", "Pauses", "pause-circle-outline"], ["MENUS", "Menus", "silverware-fork-knife"]] : [["PAUSES", "My Thali", "pause-circle-outline"], ["MENUS", "Menus", "silverware-fork-knife"]];
  if (canEdit) tabs.push(["WINDOW", "Request times", "clock-outline"]);
  const tab = tabs.some(([key]) => key === selected) ? selected : tabs[0][0];
  return <Screen contentStyle={styles.page}>
    <View style={styles.header}><View style={styles.icon}><MaterialCommunityIcons name="silverware-fork-knife" size={27} color={colors.primaryStrong} /></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>FAIZ UL MAWAID IL BURHANIYAH</Text><Text style={styles.title}>FMB</Text><Text style={styles.caption}>{manager ? "Daily servings, members and menus in one place." : "Your Thali requests and daily menus."}</Text></View></View>
    <View style={[styles.tabs, width < 600 && styles.tabsPhone]}>{tabs.map(([key, label, icon]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: key === tab }} onPress={() => setSelected(key)} style={[styles.tab, width < 600 && styles.tabPhone, key === tab && styles.activeTab]}><MaterialCommunityIcons name={icon} size={18} color={key === tab ? colors.primaryStrong : colors.muted} /><Text style={[styles.tabText, key === tab && { color: colors.primaryStrong }]}>{label}</Text></Pressable>)}</View>
    {tab === "SUMMARY" && manager ? <FmbSummaryPanel key={scope} /> : tab === "THALI" && manager ? <ThaaliPanel key={scope} canEdit={canEdit} /> : tab === "PAUSES" ? <FmbPausesPanel key={scope} manager={manager} /> : tab === "WINDOW" && canEdit ? <FmbRequestWindowPanel key={scope} canEdit={canEdit} /> : <FmbMenusPanel key={scope} manager={manager} canEdit={canEdit} />}
  </Screen>;
}
const styles = StyleSheet.create({
  page: { maxWidth: 1440 }, header: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginBottom: spacing.lg },
  icon: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accentStrong, fontSize: 9, letterSpacing: 1, fontWeight: "900" }, title: { color: colors.text, fontSize: 31, fontWeight: "900", marginTop: 4 }, caption: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  tabs: { flexDirection: "row", flexWrap: "wrap", alignSelf: "flex-start", padding: 5, gap: 4, borderRadius: radius.lg, backgroundColor: colors.backgroundAlt, marginBottom: spacing.lg }, tabsPhone: { width: "100%" },
  tab: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 16, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: "transparent" }, tabPhone: { flexGrow: 1, flexBasis: "46%", paddingHorizontal: 8 }, activeTab: { backgroundColor: colors.surface, borderColor: colors.border }, tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" }
});
