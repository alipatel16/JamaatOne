import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { fmbApi } from "../../api/fmbApi";
import { pauseThaaliPayload, resumeThaaliPayload, dayValue } from "../../utils/fmbWorkflows";
import { submitThaaliRequest } from "../../utils/fmbRequestWindow";
import { colors, spacing } from "../../theme";
import Button from "../Button";
import Card from "../Card";
import Input from "../Input";
import DatePickerField, { localDateValue, transactionDateToIso } from "../DatePickerField";
import RemotePagedSelect from "../RemotePagedSelect";
import { Empty, FmbSheet, InlineHistory, Notice, Pager, formatDay, formatTime, ui } from "./FmbUi";

const thaaliPage = (pageNumber, search) => fmbApi.getThaali({ pageNumber, search });
export default function FmbPausesPanel({ manager }) {
  const today = localDateValue();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [fromDate, setFrom] = useState("");
  const [toDate, setTo] = useState("");
  const [filters, setFilters] = useState({});
  const [memberFilter, setMemberFilter] = useState([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ fromDate: today, toDate: today, resumeDate: today, reason: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [requestWindow, setRequestWindow] = useState(null);
  const [windowError, setWindowError] = useState("");
  const [windowLoading, setWindowLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setWindowLoading(true); setWindowError("");
    fmbApi.getRequestWindow().then(result => { if (active) setRequestWindow(result); }).catch(e => { if (active) setWindowError(e.message || "Unable to check request times."); }).finally(() => { if (active) setWindowLoading(false); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setData(null);
    fmbApi.getPauses({ ...filters, pageNumber: page }).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message || "Unable to load pauses."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, filters, revision]);
  useEffect(() => {
    if (!dialog?.item) return;
    let active = true;
    setDetailLoading(true); setDetail(null);
    fmbApi.getPause(dialog.item.pauseId).then(result => { if (active) setDetail(result); }).catch(e => { if (active) setFormError(e.message || "Unable to load pause details."); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [dialog]);
  function open(kind, item) { setDialog({ kind, item }); setDetail(null); setFormError(""); setSelected([]); setForm({ fromDate: today, toDate: today, resumeDate: today, reason: "" }); }
  function refresh() { setRevision(v => v + 1); }
  function apply() {
    if (fromDate && toDate && fromDate > toDate) { setError("To date cannot be before from date."); return; }
    setPage(1); setFilters({ fromDate: fromDate ? transactionDateToIso(fromDate) : undefined, toDate: toDate ? transactionDateToIso(toDate) : undefined, ...(manager && memberFilter.length ? { muminId: memberFilter[0].muminId } : {}) });
  }
  async function save() {
    if (inFlight.current) return;
    let body;
    try { body = dialog.kind === "CREATE" ? pauseThaaliPayload({ ...form, muminId: selected[0]?.muminId }, manager, today) : resumeThaaliPayload(form, detail, today); }
    catch (e) { setFormError(e.message); return; }
    inFlight.current = true; setSaving(true); setFormError("");
    try {
      await submitThaaliRequest(fmbApi, dialog.kind === "CREATE" ? "PAUSE" : "RESUME", body, detail?.pauseId);
      setSuccess(dialog.kind === "CREATE" ? "Thali pause recorded." : "Thali resume recorded."); setDialog(null); setPage(1); refresh();
    } catch (e) { setFormError(e.message || "Unable to save Thali request."); refresh(); }
    finally { inFlight.current = false; setSaving(false); }
  }
  return <View>
    <View style={ui.heading}><View style={ui.flex}><Text style={ui.title}>{manager ? "Thali pauses" : "My Thali"}</Text><Text style={ui.meta}>{manager ? "Record requests, review paused members and resume service." : "Pause your Thali while away, or resume it earlier."}</Text></View><Button title={manager ? "Pause a Thali" : "Pause my Thali"} onPress={() => open("CREATE")} /></View>
    <Notice>{success}</Notice>
    <Card><Text style={[ui.name, { marginBottom: spacing.xs }]}>Daily request times</Text>{windowLoading ? <Text style={ui.meta}>Checking request times…</Text> : windowError ? <Text style={ui.meta}>{windowError} The request must pass a fresh check before it can be submitted.</Text> : !requestWindow ? <Text style={ui.meta}>Request times are not configured. Contact your FMB Admin or Aamil.</Text> : <View><Text style={ui.meta}>Pause: {requestWindow.pauseOpenTime || "Not set"} – {requestWindow.pauseCloseTime || "Not set"} · {requestWindow.pauseOpenNow ? "Open" : "Closed"}</Text><Text style={ui.meta}>Resume: {requestWindow.resumeOpenTime || "Not set"} – {requestWindow.resumeCloseTime || "Not set"} · {requestWindow.resumeOpenNow ? "Open" : "Closed"}</Text><Text style={ui.meta}>Jamaat server time. A fresh check is made when you submit.</Text></View>}</Card>
    <Card><View style={ui.filters}>
      {manager ? <View style={[ui.filter, { minWidth: 240 }]}><RemotePagedSelect label="Filter by member (optional)" fetchPage={thaaliPage} keyField="muminId" selected={memberFilter} onChange={setMemberFilter} /></View> : null}
      <View style={ui.filter}><DatePickerField label="From date (optional)" value={fromDate} onChange={setFrom} /></View><View style={ui.filter}><DatePickerField label="To date (optional)" value={toDate} onChange={setTo} /></View>
      <View style={[ui.actions, { marginBottom: spacing.md }]}><Button title="Apply" compact onPress={apply} /><Button title="Clear" compact variant="outline" onPress={() => { setFrom(""); setTo(""); setMemberFilter([]); setFilters({}); setPage(1); }} /><Button title="Refresh" compact variant="ghost" onPress={refresh} /></View>
    </View></Card>
    <Notice error>{error}</Notice>{error ? <Button title="Retry pauses" variant="outline" onPress={refresh} /> : null}
    {loading ? <ActivityIndicator color={colors.primary} /> : (data?.items || []).map(item => {
      const canResume = !item.resumedOn && dayValue(item.toDate) >= today && !/cancel|resum/i.test(item.status || "");
      return <Card key={item.pauseId}>
        <View style={ui.heading}><View style={ui.flex}><Text style={ui.name}>{item.fullName || (manager ? `Mumin ${item.muminId}` : "My Thali")}</Text><Text style={ui.meta}>ITS {item.itsId || "—"} · {formatDay(item.fromDate)} – {formatDay(item.toDate)}</Text></View><View style={ui.badge}><Text style={ui.badgeText}>{item.status || (item.resumedOn ? "Resumed" : dayValue(item.toDate) < today ? "Completed" : dayValue(item.fromDate) > today ? "Upcoming" : "Paused")}</Text></View></View>
        {item.reason ? <Text style={ui.body}>{item.reason}</Text> : null}
        {item.resumedOn ? <Text style={ui.meta}>Resuming on {formatDay(item.resumedOn)}</Text> : null}
        <Text style={[ui.meta, { marginTop: spacing.xs }]}>Requested by {item.requestedByName || "Member"}{item.onBehalf ? " on behalf of member" : ""} · {formatTime(item.requestedAt)}</Text>
        <View style={[ui.actions, { marginTop: spacing.md }]}><Button title="Details" compact variant="outline" onPress={() => open("DETAIL", item)} />{canResume ? <Button title="Resume Thali" compact onPress={() => open("RESUME", item)} /> : null}</View>
        <InlineHistory key={`${item.pauseId}-${revision}`} kind="PAUSE" id={item.pauseId} />
      </Card>;
    })}
    {!loading && !error && !data?.items?.length ? <Card><Empty title="No pauses found" caption="Your pause requests will appear here." /></Card> : null}
    <Pager page={page} pages={Math.max(1, data?.totalPages || 1)} total={data?.totalCount || 0} loading={loading} onChange={setPage} />
    <FmbSheet visible={Boolean(dialog)} title={dialog?.kind === "CREATE" ? (manager ? "Pause a member’s Thali" : "Pause my Thali") : dialog?.kind === "RESUME" ? "Resume Thali" : "Pause details"} subtitle={dialog?.item?.fullName} saving={saving} onClose={() => setDialog(null)} action={dialog?.kind === "DETAIL" ? null : { title: dialog?.kind === "CREATE" ? "Save pause" : "Resume Thali", onPress: save, disabled: dialog?.kind === "RESUME" && (!detail || detailLoading) }}>
      {dialog?.kind === "CREATE" ? <View>
        {manager ? <RemotePagedSelect label="Thali member *" fetchPage={thaaliPage} keyField="muminId" selected={selected} onChange={setSelected} disabled={saving} /> : <Notice>This request applies to the Thali linked to your login ITS number.</Notice>}
        <View style={ui.filters}><View style={ui.filter}><DatePickerField label="First day without Thali" required value={form.fromDate} onChange={fromDate => setForm(v => ({ ...v, fromDate }))} /></View><View style={ui.filter}><DatePickerField label="Last day without Thali" required value={form.toDate} onChange={toDate => setForm(v => ({ ...v, toDate }))} /></View></View>
      </View> : detailLoading ? <ActivityIndicator color={colors.primary} /> : detail ? <View>
        <Text style={ui.name}>{formatDay(detail.fromDate)} – {formatDay(detail.toDate)}</Text><Text style={ui.body}>{detail.reason || "No reason provided."}</Text>
        {dialog?.kind === "DETAIL" ? <View><Text style={ui.meta}>Status: {detail.status || "—"}</Text><Text style={ui.meta}>Requested by {detail.requestedByName || "Member"} · {formatTime(detail.requestedAt)}</Text>{detail.originalToDate ? <Text style={ui.meta}>Original last pause day: {formatDay(detail.originalToDate)}</Text> : null}{detail.resumedOn ? <Text style={ui.meta}>First serving day: {formatDay(detail.resumedOn)}</Text> : null}{detail.updatedByName ? <Text style={ui.meta}>Updated by {detail.updatedByName} · {formatTime(detail.updatedAt)}</Text> : null}</View> : <View style={{ marginTop: spacing.md }}><Text style={[ui.meta, { marginBottom: spacing.md }]}>Select the first day to take Thali again. Choosing a date on or before this pause starts cancels the entire pause.</Text><DatePickerField label="First serving day" required value={form.resumeDate} onChange={resumeDate => setForm(v => ({ ...v, resumeDate }))} /></View>}
      </View> : null}
      {dialog?.kind !== "DETAIL" ? <Input label="Reason (optional)" placeholder="Add a reason" value={form.reason} maxLength={500} multiline onChangeText={reason => setForm(v => ({ ...v, reason }))} editable={!saving} /> : null}
      <Notice error>{formError}</Notice>
    </FmbSheet>
  </View>;
}
