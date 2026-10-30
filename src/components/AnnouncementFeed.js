import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { announcementsApi } from "../api/announcementsApi";
import { announcementPayload, newestAnnouncements } from "../utils/announcements";
import { canManageAnnouncements } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import TimelineButton from "./TimelineButton";
import { Empty, FmbSheet, Notice, Pager, formatTime, ui } from "./fmb/FmbUi";

export default function AnnouncementFeed({ embedded = false }) {
  const { user } = useAuth();
  const manager = canManageAnnouncements(user);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState(null);
  const [text, setText] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(""); setData(null);
    announcementsApi.getAll({ pageNumber: page, pageSize: 20 }).then(result => { if (active) setData({ ...result, items: newestAnnouncements(result?.items) }); }).catch(e => { if (active) setError(e.message || "Unable to load announcements."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, user?.userId]));
  useEffect(() => { setDialog(null); setDetail(null); setFormError(""); setSuccess(""); }, [manager, user?.userId]);
  useEffect(() => {
    if (!dialog?.item || dialog.kind === "DELETE") return;
    let active = true;
    setDetailLoading(true); setDetail(null);
    announcementsApi.get(dialog.item.announcementId).then(result => {
      if (active) { setDetail(result); if (dialog.kind === "EDIT") setText(result?.announcement || ""); }
    }).catch(e => { if (active) setFormError(e.message || "Unable to load announcement."); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [dialog]);
  function open(kind, item) {
    if (kind !== "DETAIL" && (!manager || embedded)) return;
    setDialog({ kind, item }); setText(""); setDetail(null); setDetailLoading(false); setFormError("");
  }
  async function save() {
    if (!manager || embedded || inFlight.current || !dialog || (dialog.kind === "EDIT" && !detail)) return;
    let body;
    try { if (dialog.kind !== "DELETE") body = announcementPayload(text); } catch (e) { setFormError(e.message); return; }
    inFlight.current = true; setSaving(true); setFormError("");
    try {
      if (dialog.kind === "CREATE") await announcementsApi.create(body);
      else if (dialog.kind === "EDIT") await announcementsApi.update(dialog.item.announcementId, body);
      else if (dialog.kind === "DELETE") await announcementsApi.remove(dialog.item.announcementId);
      else return;
      setSuccess(dialog.kind === "DELETE" ? "Announcement deleted." : dialog.kind === "EDIT" ? "Announcement updated." : "Announcement published.");
      setDialog(null); setPage(1); setRevision(v => v + 1);
    } catch (e) { setFormError(e.message || "Unable to save announcement."); }
    finally { inFlight.current = false; setSaving(false); }
  }
  return <View>
    {!embedded ? <View style={ui.heading}><View style={ui.flex}><Text style={ui.title}>Announcements</Text><Text style={ui.meta}>Community updates remain available until deleted.</Text></View>{manager ? <Button title="Add announcement" onPress={() => open("CREATE")} /> : null}</View> : null}
    <Notice>{success}</Notice><Notice error>{error}</Notice>
    {error ? <Button title="Retry announcements" variant="outline" onPress={() => setRevision(v => v + 1)} /> : loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : !(data?.items || []).length ? <Card><Empty title="No announcements yet" caption="New community updates will appear here." /></Card> : data.items.map(item => <Card key={item.announcementId}>
      <View style={[ui.heading, { marginBottom: spacing.sm }]}><View style={ui.badge}><Text style={ui.badgeText}>COMMUNITY UPDATE</Text></View><Text style={ui.meta}>{formatTime(item.createdAt)}</Text></View>
      <Text selectable style={[ui.body, { fontSize: 15, lineHeight: 23 }]}>{item.announcement}</Text>
      <Text style={[ui.meta, { marginTop: spacing.md }]}>Created by {item.createdByName || "Jamaat member"}</Text>
      {item.updatedAt ? <Text style={ui.meta}>Updated by {item.updatedByName || "Jamaat member"} · {formatTime(item.updatedAt)}</Text> : null}
      <View style={[ui.actions, { marginTop: spacing.md }]}><Button title="Details" compact variant="outline" onPress={() => open("DETAIL", item)} /><TimelineButton key={`${item.announcementId}-${revision}`} recordId={item.announcementId} loadEntries={announcementsApi.getLogs} entityLabel="Announcement" />{manager && !embedded ? <><Button title="Edit" compact variant="outline" onPress={() => open("EDIT", item)} /><Button title="Delete" compact variant="danger" onPress={() => open("DELETE", item)} /></> : null}</View>
    </Card>)}
    {!embedded || Number(data?.totalPages) > 1 ? <Pager page={page} pages={Math.max(1, Number(data?.totalPages || 1))} total={Number(data?.totalCount || 0)} loading={loading} onChange={setPage} /> : null}
    <FmbSheet visible={Boolean(dialog)} title={dialog?.kind === "CREATE" ? "Publish announcement" : dialog?.kind === "EDIT" ? "Edit announcement" : dialog?.kind === "DELETE" ? "Delete announcement" : "Announcement details"} saving={saving} onClose={() => setDialog(null)} action={dialog?.kind === "DETAIL" ? null : { title: dialog?.kind === "DELETE" ? "Delete announcement" : dialog?.kind === "EDIT" ? "Save changes" : "Publish", variant: dialog?.kind === "DELETE" ? "danger" : "primary", onPress: save, disabled: !manager || detailLoading || (dialog?.kind === "EDIT" && !detail) }}>
      {dialog?.kind === "DELETE" ? <View><Notice error>This announcement will be removed from everyone’s dashboard. Deletion cannot be undone.</Notice><Text style={ui.body}>{dialog.item.announcement}</Text></View> : detailLoading ? <ActivityIndicator color={colors.primary} /> : dialog?.kind === "DETAIL" ? detail ? <View><Text selectable style={ui.body}>{detail.announcement}</Text><Text style={[ui.meta, { marginTop: spacing.md }]}>Created by {detail.createdByName || "Jamaat member"} · {formatTime(detail.createdAt)}</Text>{detail.updatedAt ? <Text style={ui.meta}>Updated by {detail.updatedByName || "Jamaat member"} · {formatTime(detail.updatedAt)}</Text> : null}</View> : null : <View><Input label="Announcement *" value={text} onChangeText={setText} placeholder="Write your community update" multiline maxLength={4000} editable={!saving} /><Text style={ui.meta}>{text.length}/4,000 characters</Text></View>}
      <Notice error>{formError}</Notice>
    </FmbSheet>
  </View>;
}
