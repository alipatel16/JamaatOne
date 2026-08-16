import React from "react";
import { Redirect, Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAuth } from "../../src/context/AuthContext";
import { canAccessMumineen, isSuperAdmin } from "../../src/constants/roles";
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
  "user-management": "User Management",
  receipt: "Payment receipt",
  namaz: "Namaaz",
  calendar: "Hijri calendar",
  fmb: "FMB",
  announcements: "Announcements"
};

const tabIcon = (outlineName, activeName = outlineName) => ({ color, focused }) => (
  <MaterialCommunityIcons name={focused ? activeName : outlineName} size={22} color={color} />
);

export default function AppLayout() {
  const { user, bootstrapping } = useAuth();
  const { width } = useWindowDimensions();

  if (bootstrapping) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;
  if (isSuperAdmin(user)) return <Redirect href="/super-admin" />;

  const canBrowseMumineen = canAccessMumineen(user);
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
            showBack={!['index', 'accounts', 'users', 'profile', 'user-management'].includes(route.name)}
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
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("view-dashboard-outline", "view-dashboard") }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts", tabBarIcon: tabIcon("wallet-outline", "wallet") }} />
      <Tabs.Screen name="users" options={{ title: "Mumineen", href: canBrowseMumineen ? undefined : null, tabBarIcon: tabIcon("account-group-outline", "account-group") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("account-circle-outline", "account-circle") }} />

      <Tabs.Screen name="namaz" options={{ title: "Namaaz", href: null }} />
      <Tabs.Screen name="calendar" options={{ title: "Hijri Calendar", href: null }} />
      <Tabs.Screen name="fmb" options={{ title: "FMB", href: null }} />
      <Tabs.Screen name="user-detail" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="receipt" options={{ href: null }} />
      <Tabs.Screen name="bank-accounts" options={{ href: null }} />
      <Tabs.Screen name="user-management" options={{ href: null }} />
    </Tabs>
  );
}
