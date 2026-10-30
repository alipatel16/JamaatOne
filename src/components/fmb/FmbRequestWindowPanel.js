import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { fmbApi } from "../../api/fmbApi";
import { requestWindowPayload } from "../../utils/fmbRequestWindow";
import { colors, spacing } from "../../theme";
import Button from "../Button";
import Card from "../Card";
import TimePickerField from "../TimePickerField";
import TimelineButton from "../TimelineButton";
import { Empty, Notice, formatTime, ui } from "./FmbUi";

const EMPTY = { pauseOpenTime: "", pauseCloseTime: "", resumeOpenTime: "", resumeCloseTime: "" };
const fields = Object.keys(EMPTY);

export default function FmbRequestWindowPanel({ canEdit = false }) {
  const [window, setWindow] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [logRevision, setLogRevision] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!canEdit) return;
    let active = true;
    setLoading(true); setError(""); setNotConfigured(false);
    fmbApi.getRequestWindow().then(result => {
      if (!active) return;
      setWindow(result); setForm(Object.fromEntries(fields.map(key => [key, result?.[key] || ""]))); setDirty(false);
    }).catch(e => {
      if (!active) return;
      // The published backend reports initial setup as a failed envelope,
      // rather than returning a null configuration. Only that specific
      // response should enable an empty form; other failures remain errors.
      if (e.message === "The FMB Admin has not set the pause / resume request times for your Jamaat yet.") {
        setNotConfigured(true); setWindow(null); setForm(EMPTY); setDirty(false);
      } else setError(e.message || "Unable to load request times.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canEdit, revision]);
  useEffect(() => {
    if (!canEdit) return;
    let active = true;
    setLogsLoading(true); setLogsError("");
    fmbApi.getRequestWindowLog().then(result => {
      if (active) setLogs((Array.isArray(result) ? result : []).slice().sort((a, b) => (Date.parse(b.performedAt) || 0) - (Date.parse(a.performedAt) || 0)));
    }).catch(e => { if (active) setLogsError(e.message || "Unable to load request-time history."); }).finally(() => { if (active) setLogsLoading(false); });
    return () => { active = false; };
  }, [canEdit, logRevision]);
  async function save() {
    if (!canEdit || inFlight.current || loading || error) return;
    let body;
    try { body = requestWindowPayload(form); } catch (e) { setFormError(e.message); return; }
    inFlight.current = true; setSaving(true); setFormError(""); setSuccess("");
    try {
      await fmbApi.updateRequestWindow(body);
      setSuccess("Request times saved."); setDirty(false); setRevision(v => v + 1); setLogRevision(v => v + 1);
    } catch (e) { setFormError(e.message || "Unable to save request times."); }
    finally { inFlight.current = false; setSaving(false); }
  }
  if (!canEdit) return null;
  const last = logs[0];
  return <View>
    <View style={ui.heading}><View style={ui.flex}><Text style={ui.title}>Thali request times</Text><Text style={ui.meta}>Set when pause and resume requests are accepted each day.</Text></View><Button title="Refresh" compact variant="outline" disabled={saving || dirty || loading} onPress={() => { setRevision(v => v + 1); setLogRevision(v => v + 1); }} /></View>
    <Notice>{success}</Notice><Notice error>{error}</Notice>
    {notConfigured ? <Notice>No request times have been set yet. Select all four times and save to configure them.</Notice> : null}
    {loading ? <ActivityIndicator color={colors.primary} /> : <Card>
      <Text style={[ui.meta, { marginBottom: spacing.lg }]}>Tap a clock to select a time. The closing minute is included. Requests use Jamaat server time and are checked again before submission.</Text>
      {["pause", "resume"].map(kind => <View key={kind} style={{ marginBottom: spacing.md }}>
        <View style={ui.heading}><Text style={ui.name}>{kind === "pause" ? "Pause requests" : "Resume requests"}</Text><View style={ui.badge}><Text style={ui.badgeText}>{window?.[`${kind}OpenNow`] === true ? "Open now" : "Closed now"}</Text></View></View>
        <View style={ui.filters}>{[["OpenTime", "Opens at"], ["CloseTime", "Closes at"]].map(([suffix, label]) => {
          const key = `${kind}${suffix}`;
          return <View key={key} style={ui.filter}><TimePickerField label={`${kind === "pause" ? "Pause" : "Resume"} ${label.toLowerCase()} *`} value={form[key]} disabled={saving || Boolean(error)} onChange={value => { setForm(current => ({ ...current, [key]: value })); setDirty(true); setSuccess(""); }} /></View>;
        })}</View>
      </View>)}
      {window?.serverTime ? <Text style={[ui.meta, { marginBottom: spacing.md }]}>Server time at last check: {window.serverTime}</Text> : null}
      <Notice error>{formError}</Notice>
      <View style={ui.actions}><Button title="Save request times" loading={saving} disabled={Boolean(error)} onPress={save} />{dirty ? <Button title="Discard changes" variant="outline" disabled={saving} onPress={() => { setForm(Object.fromEntries(fields.map(key => [key, window?.[key] || ""]))); setDirty(false); setFormError(""); }} /> : null}</View>
    </Card>}
    <Card>
      <View style={ui.heading}><Text style={ui.title}>Change history</Text><Button title="Refresh history" compact variant="outline" disabled={logsLoading} onPress={() => setLogRevision(v => v + 1)} /></View>
      {last ? <Notice>Last changed by {last.performedByName || `User ${last.performedBy}`} · {formatTime(last.performedAt)}</Notice> : null}
      <Notice error>{logsError}</Notice>
      {logsLoading ? <ActivityIndicator color={colors.primary} /> : !logsError && !logs.length ? <Empty title="No changes recorded yet" /> : null}
      <TimelineButton loadEntries={fmbApi.getRequestWindowLog} entityLabel="Request window" revision={logRevision} />
    </Card>
  </View>;
}
