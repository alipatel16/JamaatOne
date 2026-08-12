import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Card from "../../src/components/Card";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import { canManageJamaat } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radius, spacing } from "../../src/theme";

const QUICK_LINKS = [
  { title: "Accounts", caption: "Payments & ledgers", icon: "₹", route: "/(app)/accounts", managerOnly: false },
  { title: "Namaaz", caption: "Prayer timings", icon: "◷", route: "/(app)/namaz", managerOnly: false },
  { title: "Calendar", caption: "Hijri calendar", icon: "▦", route: "/(app)/calendar", managerOnly: false },
  { title: "FMB", caption: "Menu & thali", icon: "◉", route: "/(app)/fmb", managerOnly: false },
  { title: "Mumineen", caption: "Member directory", icon: "◎", route: "/(app)/users", managerOnly: true }
];

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const manager = canManageJamaat(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(endpoints.dashboard).then(setData).catch(e => setError(e.message));
  }, []);

  const quickLinks = useMemo(() => QUICK_LINKS.filter(item => !item.managerOnly || manager), [manager]);
  const wide = width >= 850;
  const phone = width < 600;
  const narrow = width < 340;

  if (!data && !error) return <LoadingView />;

  return (
    <Screen>
      <View style={[styles.hero, phone && styles.heroPhone, wide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>ASSALAMU ALAIKUM</Text>
          <Text style={[styles.greeting, phone && styles.greetingPhone]}>Salaam, {user?.firstName || user?.name || "Member"}</Text>
          <Text style={styles.heroText}>Everything important for your Jamaat, at a glance.</Text>
          <View style={styles.dateRow}>
            <View style={styles.datePill}><Text style={styles.dateText}>{data?.gregorianDate || "Today"}</Text></View>
            {data?.hijriDate ? <View style={[styles.datePill, styles.hijriPill]}><Text style={styles.hijriText}>{data.hijriDate}</Text></View> : null}
          </View>
        </View>
        <View style={styles.heroMark}><Text style={styles.heroMarkText}>J</Text></View>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View> : null}

      <Text style={styles.sectionEyebrow}>QUICK ACCESS</Text>
      <View style={[styles.quickGrid, phone && styles.quickGridPhone]}>
        {quickLinks.map((item, index) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(item.route)}
            style={({ pressed }) => [
              styles.quickCard,
              phone && styles.quickCardPhone,
              phone && quickLinks.length % 2 === 1 && index === quickLinks.length - 1 && styles.quickCardPhoneLast,
              narrow && styles.quickCardNarrow,
              pressed && styles.pressed
            ]}
          >
            <View style={[styles.quickIcon, phone && styles.quickIconPhone]}>
              <Text style={styles.quickIconText}>{item.icon}</Text>
            </View>
            <View style={phone ? styles.quickCopyPhone : undefined}>
              <Text numberOfLines={1} style={[styles.quickTitle, phone && styles.quickTitlePhone]}>{item.title}</Text>
              <Text numberOfLines={2} style={[styles.quickCaption, phone && styles.quickCaptionPhone]}>{item.caption}</Text>
            </View>
            <Text style={[styles.quickArrow, phone && styles.quickArrowPhone]}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.contentGrid, wide && styles.contentGridWide]}>
        <View style={styles.mainColumn}>
          <View style={[styles.sectionHeader, narrow && styles.sectionHeaderNarrow]}>
            <View>
              <Text style={styles.sectionEyebrow}>COMMUNITY</Text>
              <Text style={styles.sectionTitle}>Announcements</Text>
            </View>
            {manager ? (
              <Pressable style={styles.manageButton} onPress={() => router.push("/(app)/announcements")}>
                <Text style={styles.manageText}>Manage</Text>
              </Pressable>
            ) : null}
          </View>

          {data?.announcements?.length ? data.announcements.map(item => (
            <Card key={item.id} style={styles.announcementCard}>
              <View style={styles.announcementTop}>
                <View style={styles.typeBadge}><Text style={styles.type}>{item.type || "Update"}</Text></View>
                {item.location ? <Text style={styles.location}>{item.location}</Text> : null}
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </Card>
          )) : (
            <Card><Text style={styles.empty}>No announcements for today.</Text></Card>
          )}
        </View>

        <View style={styles.sideColumn}>
          <Pressable onPress={() => router.push("/(app)/fmb")}> 
            <Card style={styles.fmbCard}>
              <View style={styles.fmbIcon}><Text style={styles.fmbIconText}>◉</Text></View>
              <Text style={styles.fmbLabel}>TODAY'S FMB</Text>
              <Text style={styles.fmbStatus}>
                {data?.fmb?.status === "NO_FMB" ? "No FMB today" : data?.fmb?.status === "DELIVERED" ? "FMB delivered" : "FMB scheduled"}
              </Text>
              {data?.fmb?.menu ? <Text style={styles.fmbMenu}>{data.fmb.menu}</Text> : null}
              <Text style={styles.fmbLink}>View FMB ›</Text>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/(app)/namaz")}> 
            <Card style={styles.namazCard}>
              <Text style={styles.namazEyebrow}>NAMAAZ</Text>
              <Text style={styles.namazTitle}>Prayer timings</Text>
              <Text style={styles.namazText}>View the prayer schedule for your current location.</Text>
              <Text style={styles.namazLink}>Open timings ›</Text>
            </Card>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primaryDark, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, overflow: "hidden", flexDirection: "row", minHeight: 220 },
  heroWide: { padding: spacing.xxl },
  heroPhone: { padding: spacing.lg, minHeight: 190, marginBottom: spacing.lg, borderRadius: 22 },
  heroCopy: { flex: 1, zIndex: 2, justifyContent: "center" },
  eyebrow: { color: "#D9BE82", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  greeting: { color: "#FFFFFF", fontSize: 31, lineHeight: 38, fontWeight: "900", marginTop: spacing.xs },
  greetingPhone: { fontSize: 27, lineHeight: 33, maxWidth: "88%" },
  heroText: { color: "#CFE0DC", marginTop: spacing.sm, fontSize: 15, lineHeight: 22, maxWidth: 520 },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.lg },
  datePill: { backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  dateText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  hijriPill: { backgroundColor: "rgba(200,155,70,0.15)", borderColor: "rgba(216,187,123,0.30)" },
  hijriText: { color: "#F1D9A8", fontSize: 11, fontWeight: "900" },
  heroMark: { position: "absolute", right: -18, bottom: -40, width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(255,255,255,0.055)", alignItems: "center", justifyContent: "center" },
  heroMarkText: { color: "rgba(255,255,255,0.10)", fontSize: 120, fontWeight: "900" },
  errorBox: { backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  error: { color: colors.danger, fontWeight: "700" },
  sectionEyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: spacing.sm },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  quickGridPhone: { justifyContent: "space-between", columnGap: 0, rowGap: spacing.sm },
  quickCard: { minWidth: 145, flexGrow: 1, flexShrink: 1, flexBasis: 145, maxWidth: 230, minHeight: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  quickCardPhone: { width: "47.5%", minWidth: 0, maxWidth: "47.5%", flexGrow: 0, flexShrink: 0, flexBasis: "47.5%", minHeight: 106, padding: 13, justifyContent: "center" },
  quickCardPhoneLast: { width: "100%", maxWidth: "100%", flexBasis: "100%", minHeight: 92 },
  quickCardNarrow: { width: "100%", maxWidth: "100%", flexBasis: "100%", minHeight: 88, flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  quickIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  quickIconPhone: { width: 36, height: 36, borderRadius: 12 },
  quickIconText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 18 },
  quickTitle: { color: colors.text, fontWeight: "900", marginTop: spacing.md, fontSize: 15 },
  quickTitlePhone: { marginTop: 10, fontSize: 14, lineHeight: 18, paddingRight: 18 },
  quickCaption: { color: colors.muted, fontSize: 11, marginTop: 3 },
  quickCaptionPhone: { fontSize: 10.5, lineHeight: 14, paddingRight: 8 },
  quickCopyPhone: { minWidth: 0 },
  quickArrow: { color: colors.accentStrong, fontSize: 23, position: "absolute", right: 14, top: 12 },
  quickArrowPhone: { right: 11, top: 9, fontSize: 21 },
  contentGrid: { gap: spacing.md },
  contentGridWide: { flexDirection: "row", alignItems: "flex-start", gap: spacing.lg },
  mainColumn: { flex: 1, minWidth: 0 },
  sideColumn: { width: "100%", maxWidth: 350 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  sectionHeaderNarrow: { alignItems: "flex-start", flexWrap: "wrap" },
  sectionTitle: { color: colors.text, fontWeight: "900", fontSize: 23, marginTop: -4 },
  manageButton: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primarySoftStrong, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.pill },
  manageText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 12 },
  announcementCard: { padding: spacing.lg },
  announcementTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  typeBadge: { backgroundColor: colors.accentSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  type: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  location: { color: colors.muted, fontSize: 11 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  body: { color: colors.textSoft, lineHeight: 21, marginTop: spacing.sm },
  empty: { color: colors.muted },
  fmbCard: { backgroundColor: colors.accentSoft, borderColor: "#F0DFC0" },
  fmbIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F3E2BF", alignItems: "center", justifyContent: "center" },
  fmbIconText: { color: colors.accentStrong, fontWeight: "900" },
  fmbLabel: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.2, marginTop: spacing.md },
  fmbStatus: { color: colors.text, fontWeight: "900", fontSize: 20, marginTop: 4 },
  fmbMenu: { color: colors.textSoft, lineHeight: 20, marginTop: spacing.sm },
  fmbLink: { color: colors.accentStrong, fontWeight: "900", marginTop: spacing.md },
  namazCard: { backgroundColor: colors.surfaceTint, borderColor: colors.primarySoftStrong },
  namazEyebrow: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  namazTitle: { color: colors.text, fontWeight: "900", fontSize: 20, marginTop: 4 },
  namazText: { color: colors.textSoft, lineHeight: 20, marginTop: spacing.sm },
  namazLink: { color: colors.primaryStrong, fontWeight: "900", marginTop: spacing.md }
});
