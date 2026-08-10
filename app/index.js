import React from "react";
import { Redirect } from "expo-router";

import LoadingView from "../src/components/LoadingView";
import { isSuperAdmin } from "../src/constants/roles";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;

  return <Redirect href={isSuperAdmin(user) ? "/super-admin" : "/(app)"} />;
}
