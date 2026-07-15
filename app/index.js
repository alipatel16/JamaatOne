import React from "react";
import { Redirect } from "expo-router";
import LoadingView from "../src/components/LoadingView";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) return <LoadingView />;

  return <Redirect href={user ? "/(app)" : "/login"} />;
}
