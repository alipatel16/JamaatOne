import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { usePathname, useRouter } from "expo-router";

import { useAuth } from "../context/AuthContext";
import { canManageJamaat } from "../constants/roles";
import { colors, radius, shadows, spacing, typography } from "../theme";

const PRIMARY_ITEMS = [
  { label: "Home", route: "/(app)", match: "/", icon: "⌂" },
  { label: "Accounts", route: "/(app)/accounts", match: "/accounts", icon: "₹" },
  { label: "Mumineen", route: "/(app)/users", match: "/users", icon: "◉", managerOnly: true },
  { label: "Profile", route: "/(app)/profile", match: "/profile", icon: "○" }
];

const MENU_ITEMS = [
  { label: "Namaaz timings", route: "/(app)/namaz", icon: "◷", caption: "Location-based prayer schedule" },
  { label: "Hijri calendar", route: "/(app)/calendar", icon: "▦", caption: "Calendar and important dates" },
  { label: "FMB services", route: "/(app)/fmb", icon: "◉", caption: "Menu and thali services" },
  { label: "Announcements", route: "/(app)/announcements", icon: "◇", caption: "Community updates" }
];

export default function AppHeader({ title, showBack = false, fallbackRoute = "/" }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const manager = canManageJamaat(user?.role);
  const isDesktop = width >= 1024;
  const isPhone = width < 600;
  const isNarrow = width < 390;

  function navigate(route) {
    setOpen(false);
    router.push(route);
  }

  function goBack() {
    setOpen(false);
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
    router.replace(fallbackRoute);
  }

  function isActive(match) {
    if (match === "/") return pathname === "/" || pathname === "/(app)";
    return pathname?.includes(match);
  }

  const primaryItems = PRIMARY_ITEMS.filter(item => !item.managerOnly || manager);

  return (
    <>
      <View style={[styles.header, isPhone && styles.headerPhone, isDesktop && styles.headerDesktop]}>
        <View style={[styles.brandGroup, !isDesktop && styles.brandGroupMobile]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showBack ? "Go back" : "Open navigation menu"}
            onPress={showBack ? goBack : () => setOpen(true)}
            style={styles.menuButton}
          >
            <Text style={[styles.menuIcon, showBack && styles.backIcon]}>{showBack ? "‹" : "☰"}</Text>
          </Pressable>

          <View style={[styles.brandMark, isNarrow && styles.brandMarkNarrow]}>
            <Text style={styles.brandInitial}>J</Text>
          </View>
          <View style={styles.titleWrap}>
            {!isNarrow ? <Text style={styles.brand}>JAMAATONE</Text> : null}
            <Text numberOfLines={1} style={styles.title}>{title || "JamaatOne"}</Text>
          </View>
        </View>

        {isDesktop ? (
          <View style={styles.desktopNav}>
            {primaryItems.map(item => {
              const active = isActive(item.match);
              return (
                <Pressable
                  key={item.label}
                  onPress={() => navigate(item.route)}
                  style={({ pressed }) => [
                    styles.desktopNavItem,
                    active && styles.desktopNavItemActive,
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.desktopNavIcon, active && styles.desktopNavTextActive]}>{item.icon}</Text>
                  <Text style={[styles.desktopNavText, active && styles.desktopNavTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable onPress={() => navigate("/(app)/profile")} style={styles.userSummary}>
          {isDesktop ? (
            <View style={styles.userText}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || "Member"}</Text>
              <Text style={styles.userRole}>{manager ? "Management" : "Member"}</Text>
            </View>
          ) : null}
          <View style={[styles.avatar, isPhone && styles.avatarPhone]}>
            <Text style={styles.avatarText}>{(user?.name || "J").slice(0, 1).toUpperCase()}</Text>
          </View>
        </Pressable>
      </View>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.drawer, isPhone && styles.drawerPhone, shadows.floating]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandRow}>
                <View style={styles.drawerBrandMark}><Text style={styles.drawerBrandInitial}>J</Text></View>
                <View>
                  <Text style={styles.drawerEyebrow}>JAMAATONE</Text>
                  <Text style={styles.drawerTitle}>Community hub</Text>
                </View>
              </View>
              <Pressable onPress={() => setOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!isDesktop ? (
                <>
                  <Text style={styles.sectionLabel}>MAIN</Text>
                  <View style={styles.mobilePrimaryGrid}>
                    {primaryItems.map(item => (
                      <Pressable key={item.label} onPress={() => navigate(item.route)} style={styles.mobilePrimaryItem}>
                        <Text style={styles.mobilePrimaryIcon}>{item.icon}</Text>
                        <Text style={styles.mobilePrimaryLabel}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.sectionLabel}>SERVICES</Text>
              {MENU_ITEMS.map(item => (
                <Pressable
                  key={item.route}
                  onPress={() => navigate(item.route)}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                >
                  <View style={styles.menuGlyph}><Text style={styles.menuGlyphText}>{item.icon}</Text></View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuCaption}>{item.caption}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.drawerFooter}>
              <View style={styles.footerAvatar}>
                <Text style={styles.footerAvatarText}>{(user?.name || "J").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.footerCopy}>
                <Text style={styles.footerName}>{user?.name || "Jamaat member"}</Text>
                <Text style={styles.footerRole}>ITS {user?.itsId || "-"} · {manager ? "Management" : "Member"}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: Platform.OS === "web" ? 78 : 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerDesktop: { paddingHorizontal: spacing.xl },
  headerPhone: { minHeight: 64, paddingHorizontal: spacing.sm },
  brandGroup: { flexDirection: "row", alignItems: "center", minWidth: 250 },
  brandGroupMobile: { flex: 1, minWidth: 0 },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.border
  },
  menuIcon: { fontSize: 20, color: colors.primaryStrong, fontWeight: "800" },
  backIcon: { fontSize: 32, lineHeight: 32, fontWeight: "400" },
  brandMark: { width: 38, height: 38, marginLeft: spacing.sm, borderRadius: 12, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  brandMarkNarrow: { width: 34, height: 34, borderRadius: 11, marginLeft: spacing.xs },
  brandInitial: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  titleWrap: { marginLeft: spacing.sm, flex: 1, minWidth: 0 },
  brand: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.text, fontFamily: typography.family, fontSize: 16, fontWeight: "800", marginTop: 1, textTransform: "capitalize" },
  desktopNav: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md },
  desktopNavItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, minHeight: 42, borderRadius: radius.pill, gap: 7 },
  desktopNavItemActive: { backgroundColor: colors.primarySoft },
  desktopNavIcon: { color: colors.muted, fontSize: 15, fontWeight: "900" },
  desktopNavText: { color: colors.textSoft, fontSize: 13, fontWeight: "800" },
  desktopNavTextActive: { color: colors.primaryStrong },
  userSummary: { minWidth: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginLeft: "auto", flexShrink: 0 },
  userText: { maxWidth: 160, alignItems: "flex-end", marginRight: spacing.sm },
  userName: { color: colors.text, fontSize: 13, fontWeight: "800", maxWidth: 150 },
  userRole: { color: colors.muted, fontSize: 10, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: "#F0E0BE", alignItems: "center", justifyContent: "center" },
  avatarPhone: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { color: colors.accentStrong, fontWeight: "900" },
  modalRoot: { flex: 1, flexDirection: "row" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  drawer: { width: "88%", maxWidth: 390, height: "100%", backgroundColor: colors.surface, paddingTop: Platform.OS === "web" ? 28 : 54, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderTopRightRadius: Platform.OS === "web" ? radius.xl : 0, borderBottomRightRadius: Platform.OS === "web" ? radius.xl : 0 },
  drawerPhone: { width: "92%", paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  drawerScroll: { flex: 1 },
  drawerScrollContent: { paddingBottom: spacing.md },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
  drawerBrandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  drawerBrandMark: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  drawerBrandInitial: { color: "#fff", fontSize: 23, fontWeight: "900" },
  drawerEyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  drawerTitle: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: 2 },
  closeButton: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundAlt },
  closeText: { fontSize: 26, color: colors.textSoft },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: spacing.sm, marginTop: spacing.xs },
  mobilePrimaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  mobilePrimaryItem: { width: "48%", minHeight: 72, borderRadius: radius.lg, backgroundColor: colors.surfaceTint, borderWidth: 1, borderColor: colors.border, padding: spacing.md, justifyContent: "space-between" },
  mobilePrimaryIcon: { color: colors.primaryStrong, fontSize: 20, fontWeight: "900" },
  mobilePrimaryLabel: { color: colors.text, fontWeight: "800", fontSize: 13 },
  menuItem: { flexDirection: "row", alignItems: "center", minHeight: 72, borderRadius: radius.lg, paddingHorizontal: spacing.sm, marginBottom: 4 },
  pressed: { opacity: 0.68 },
  menuGlyph: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  menuGlyphText: { color: colors.accentStrong, fontSize: 18, fontWeight: "900" },
  menuContent: { flex: 1, marginLeft: spacing.md },
  menuLabel: { color: colors.text, fontSize: 15, fontWeight: "800" },
  menuCaption: { color: colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: colors.muted, fontSize: 24 },
  drawerFooter: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primarySoftStrong, flexDirection: "row", alignItems: "center" },
  footerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  footerAvatarText: { color: "#fff", fontWeight: "900" },
  footerCopy: { flex: 1, marginLeft: spacing.sm },
  footerName: { color: colors.text, fontWeight: "800", fontSize: 13 },
  footerRole: { color: colors.muted, marginTop: 3, fontSize: 11 }
});
