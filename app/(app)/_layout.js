import React from "react";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { canManageJamaat } from "../../src/constants/roles";
import LoadingView from "../../src/components/LoadingView";

export default function AppLayout() {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;

  const manager = canManageJamaat(user.role);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#D3AA00"
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="namaz" options={{ title: "Namaaz" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="fmb" options={{ title: "FMB" }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts" }} />
      <Tabs.Screen
        name="users"
        options={{ title: "Users", href: manager ? undefined : null }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="user-detail" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="receipt" options={{ href: null }} />
    </Tabs>
  );
}
