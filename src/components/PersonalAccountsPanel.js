import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { mumineenApi } from "../api/mumineenApi";
import { resolvePersonalMumin, personalPaymentFilters } from "../utils/personalPayments";
import { colors } from "../theme";
import Screen from "./Screen";
import Card from "./Card";
import Button from "./Button";
import PaymentPanel from "./PaymentPanel";
import DatePickerField from "./DatePickerField";
import { Notice, ui } from "./fmb/FmbUi";

export default function PersonalAccountsPanel({ user }) {
  const [muminId, setMuminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [fromDate, setFrom] = useState("");
  const [toDate, setTo] = useState("");
  const [dates, setDates] = useState({});
  const [dateError, setDateError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setMuminId(null); setError("");
    resolvePersonalMumin(user, mumineenApi).then(id => { if (active) setMuminId(id); }).catch(e => { if (active) setError(e.message || "Unable to load your payment history."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.userId, user?.itsNo, user?.itsId, revision]);
  return <Screen><View style={ui.heading}><View><Text style={ui.title}>My payment history</Text><Text style={ui.meta}>Payments linked to your ITS number {user?.itsNo || user?.itsId}.</Text></View></View>
    <Notice error>{error}</Notice>{loading ? <ActivityIndicator color={colors.primary} /> : error ? <Button title="Retry payment history" variant="outline" onPress={() => setRevision(v => v + 1)} /> : muminId ? <View>
      <Card><View style={ui.filters}><View style={ui.filter}><DatePickerField label="From date (optional)" value={fromDate} onChange={setFrom} /></View><View style={ui.filter}><DatePickerField label="To date (optional)" value={toDate} onChange={setTo} /></View><View style={ui.actions}><Button title="Apply dates" compact onPress={() => { if (fromDate && toDate && fromDate > toDate) { setDateError("To date cannot be before from date."); return; } setDateError(""); setDates({ fromDate, toDate }); }} /><Button title="Clear dates" compact variant="outline" onPress={() => { setFrom(""); setTo(""); setDates({}); setDateError(""); }} /></View></View><Notice error>{dateError}</Notice></Card>
      <PaymentPanel key={muminId} manager={false} canEdit={false} canRefund={false} hideCreateButton filters={personalPaymentFilters(muminId, dates)} />
    </View> : null}
  </Screen>;
}
