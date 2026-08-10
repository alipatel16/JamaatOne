import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";

import { useAuth } from "../../src/context/AuthContext";
import { canManageJamaat, isSuperAdmin } from "../../src/constants/roles";
import LoadingView from "../../src/components/LoadingView";
import AppHeader from "../../src/components/AppHeader";

const ROUTE_TITLES = {
  index: "Home",
  users: "Mumineen",
  "user-detail": "Mumin Details"
};

const tabIcon = symbol => ({ color }) => (
  <Text style={{ color, fontSize: 20, fontWeight: "800" }}>{symbol}</Text>
);

export default function AppLayout() {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;
  if (isSuperAdmin(user)) return <Redirect href="/super-admin" />;

  const manager = canManageJamaat(user.role);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => (
          <AppHeader
            title={ROUTE_TITLES[route.name] || route.name.replace(/-/g, " ")}
          />
        ),
        tabBarActiveTintColor: "#526A61",
        tabBarInactiveTintColor: "#8B9590",
        tabBarStyle: {
          height: 66,
          paddingTop: 7,
          paddingBottom: 8,
          borderTopColor: "#E3E8E5",
          backgroundColor: "#FFFFFF"
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" }
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("⌂") }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts", tabBarIcon: tabIcon("₹") }} />
      <Tabs.Screen
        name="users"
        options={{ title: "Mumineen", href: manager ? undefined : null, tabBarIcon: tabIcon("◉") }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("○") }} />

      <Tabs.Screen name="namaz" options={{ title: "Namaaz", href: null }} />
      <Tabs.Screen name="calendar" options={{ title: "Hijri Calendar", href: null }} />
      <Tabs.Screen name="fmb" options={{ title: "FMB", href: null }} />
      <Tabs.Screen name="user-detail" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="receipt" options={{ href: null }} />
    </Tabs>
  );
}
