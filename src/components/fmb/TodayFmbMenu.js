import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { fmbApi } from "../../api/fmbApi";
import { menuForDate } from "../../utils/fmbWorkflows";
import { localDateValue } from "../DatePickerField";
import { MenuContent, ui } from "./FmbUi";

export default function TodayFmbMenu() {
  const [today, setToday] = useState(localDateValue());
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useFocusEffect(React.useCallback(() => { setToday(localDateValue()); setRevision(v => v + 1); }, []));
  useEffect(() => {
    const timer = setInterval(() => setToday(localDateValue()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setMenu(null); setError("");
    fmbApi.getMenus({ fromDate: `${today}T00:00:00`, toDate: `${today}T23:59:59`, pageSize: 20 }).then(result => { if (active) setMenu(menuForDate(result?.items, today)); }).catch(e => { if (active) setError(e.message || "Unable to load today’s menu."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [today, revision]);
  return <View><Text style={ui.name}>{loading ? "Loading today’s menu…" : error ? "Today’s menu unavailable" : menu ? "Today’s menu" : "No menu published for today"}</Text>{menu ? <MenuContent value={menu.menuJson} compact /> : null}{error ? <Text style={ui.meta}>{error}</Text> : null}</View>;
}
