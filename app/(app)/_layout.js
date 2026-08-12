import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Text, useWindowDimensions } from "react-native";

import { useAuth } from "../../src/context/AuthContext";
import { canManageJamaat, isSuperAdmin } from "../../src/constants/roles";
import LoadingView from "../../src/components/LoadingView";
import AppHeader from "../../src/components/AppHeader";
import { colors } from "../../src/theme";

const ROUTE_TITLES = {
  index: "Home",
  accounts: "Accounts",
  users: "Mumineen",
  profile: "Profile",
  "user-detail": "Mumin details",
  "bank-accounts": "Bank accounts",
  receipt: "Payment receipt",
  namaz: "Namaaz",
  calendar: "Hijri calendar",
  fmb: "FMB",
  announcements: "Announcements"
};

const tabIcon = symbol => ({ color }) => (
  <Text style={{ color, fontSize: 20, fontWeight: "900" }}>{symbol}</Text>
);

export default function AppLayout() {
  const { user, bootstrapping } = useAuth();
  const { width } = useWindowDimensions();

  if (bootstrapping) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;
  if (isSuperAdmin(user)) return <Redirect href="/super-admin" />;

  const manager = canManageJamaat(user.role);
  const desktop = width >= 1024;
  const narrowPhone = width < 380;

  return (
    <Tabs
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => (
          <AppHeader
            title={ROUTE_TITLES[route.name] || route.name.replace(/-/g, " ")}
            showBack={!['index', 'accounts', 'users', 'profile'].includes(route.name)}
            fallbackRoute={['bank-accounts', 'receipt'].includes(route.name) ? '/(app)/accounts' : '/(app)'}
          />
        ),
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: desktop ? { display: "none" } : {
          height: narrowPhone ? 66 : 72,
          paddingTop: 7,
          paddingBottom: narrowPhone ? 6 : 9,
          paddingHorizontal: 4,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          elevation: 10,
          shadowColor: "#102D29",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 }
        },
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 2 },
        tabBarLabelStyle: { fontSize: narrowPhone ? 9 : 10, fontWeight: "800", marginTop: 1 }
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("⌂") }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts", tabBarIcon: tabIcon("₹") }} />
      <Tabs.Screen name="users" options={{ title: "Mumineen", href: manager ? undefined : null, tabBarIcon: tabIcon("◉") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("○") }} />

      <Tabs.Screen name="namaz" options={{ title: "Namaaz", href: null }} />
      <Tabs.Screen name="calendar" options={{ title: "Hijri Calendar", href: null }} />
      <Tabs.Screen name="fmb" options={{ title: "FMB", href: null }} />
      <Tabs.Screen name="user-detail" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="receipt" options={{ href: null }} />
      <Tabs.Screen name="bank-accounts" options={{ href: null }} />
    </Tabs>
  );
}
