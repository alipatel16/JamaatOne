import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../context/AuthContext";
import { canManageJamaat } from "../constants/roles";
import { colors, radius, shadows, spacing, typography } from "../theme";

const MENU_ITEMS = [
  { label: "Namaaz timings", route: "/namaz", icon: "◷" },
  { label: "Hijri calendar", route: "/calendar", icon: "▦" },
  { label: "FMB services", route: "/fmb", icon: "◉" },
  { label: "Announcements", route: "/announcements", icon: "◇" }
];

export default function AppHeader({ title, showBack = false, fallbackRoute = "/" }) {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const manager = canManageJamaat(user?.role);
  const isWide = width >= 900;

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

  return (
    <>
      <View style={[styles.header, isWide && styles.headerWide]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showBack ? "Go back" : "Open navigation menu"}
          onPress={showBack ? goBack : () => setOpen(true)}
          style={styles.menuButton}
        >
          <Text style={[styles.menuIcon, showBack && styles.backIcon]}>
            {showBack ? "‹" : "☰"}
          </Text>
        </Pressable>

        <View style={styles.brandMark}>
          <Text style={styles.brandInitial}>J</Text>
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.brand}>JAMAATONE</Text>
          <Text numberOfLines={1} style={styles.title}>
            {title || "JamaatOne"}
          </Text>
        </View>

        <View style={styles.userSummary}>
          {isWide ? (
            <View style={styles.userText}>
              <Text style={styles.userName}>{user?.name || "Member"}</Text>
              <Text style={styles.userRole}>
                {manager ? "Jamaat management" : "Member access"}
              </Text>
            </View>
          ) : null}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || "J").slice(0, 1)}
            </Text>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.drawer, shadows.card]}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerEyebrow}>JAMAATONE</Text>
                <Text style={styles.drawerTitle}>Community services</Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>EXPLORE</Text>
            {MENU_ITEMS.map(item => (
              <Pressable
                key={item.route}
                onPress={() => navigate(item.route)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed
                ]}
              >
                <View style={styles.menuGlyph}>
                  <Text style={styles.menuGlyphText}>{item.icon}</Text>
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuCaption}>
                    Open {item.label.toLowerCase()}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}

            <View style={styles.drawerFooter}>
              <Text style={styles.footerName}>
                {user?.name || "Jamaat member"}
              </Text>
              <Text style={styles.footerRole}>
                ITS {user?.itsId || "-"} · {manager ? "Management" : "Member"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    height: Platform.OS === "web" ? 76 : 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerWide: {
    paddingHorizontal: spacing.xl
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border
  },
  menuIcon: {
    fontSize: 20,
    color: colors.text,
    fontWeight: "700"
  },
  backIcon: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: "400"
  },
  brandMark: {
    width: 38,
    height: 38,
    marginLeft: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  brandInitial: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700"
  },
  titleWrap: {
    flex: 1,
    marginLeft: spacing.sm
  },
  brand: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3
  },
  title: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 1,
    textTransform: "capitalize"
  },
  userSummary: {
    flexDirection: "row",
    alignItems: "center"
  },
  userText: {
    alignItems: "flex-end",
    marginRight: spacing.sm
  },
  userName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  userRole: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.warning,
    fontWeight: "700"
  },
  modalRoot: {
    flex: 1,
    flexDirection: "row"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(37, 49, 45, 0.26)"
  },
  drawer: {
    width: "86%",
    maxWidth: 380,
    height: "100%",
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === "web" ? 32 : 54,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl
  },
  drawerEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4
  },
  drawerTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "700",
    marginTop: 4
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundAlt
  },
  closeText: {
    fontSize: 26,
    color: colors.text
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.sm
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  menuItemPressed: {
    opacity: 0.65
  },
  menuGlyph: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  menuGlyphText: {
    color: colors.warning,
    fontSize: 18,
    fontWeight: "700"
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.md
  },
  menuLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  menuCaption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3
  },
  chevron: {
    color: colors.muted,
    fontSize: 24
  },
  drawerFooter: {
    marginTop: "auto",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt
  },
  footerName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14
  },
  footerRole: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 12
  }
});
