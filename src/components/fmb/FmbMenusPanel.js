import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { fmbApi } from "../../api/fmbApi";
import { createMenusPayload, updateMenuPayload, parseMenu, dayValue } from "../../utils/fmbWorkflows";
import { colors, radius, spacing } from "../../theme";
import Card from "../Card";
import Button from "../Button";
import Input from "../Input";
import DatePickerField, { localDateValue, transactionDateToIso } from "../DatePickerField";
import { Empty, FmbSheet, InlineHistory, MENU_FIELDS, MenuContent, Notice, Pager, formatDay, formatTime, ui } from "./FmbUi";

const makeEntry = date => ({ date, menu: {}, jsonText: "{}", advanced: false });
export default function FmbMenusPanel({ manager, canEdit = false }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const today = localDateValue();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [fromDate, setFrom] = useState(today);
  const [toDate, setTo] = useState(localDateValue(new Date(Date.now() + 21 * 86400000)));
  const [query, setQuery] = useState({ fromDate, toDate });
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [expanded, setExpanded] = useState(0);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setData(null); setError("");
    fmbApi.getMenus({ fromDate: query.fromDate ? transactionDateToIso(query.fromDate) : undefined, toDate: query.toDate ? transactionDateToIso(query.toDate) : undefined, pageNumber: page }).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message || "Unable to load menus."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, page, revision]);
  useEffect(() => {
    if (!dialog?.item || dialog.kind === "DELETE") return;
    let active = true;
    setDetailLoading(true); setDetail(null);
    fmbApi.getMenu(dialog.item.menuId).then(result => {
      if (!active) return;
      setDetail(result);
      if (dialog.kind === "EDIT") {
        const menu = parseMenu(result.menuJson) ?? {};
        setEntries([{ date: dayValue(result.menuDate), menu, advanced: Array.isArray(menu) || typeof menu !== "object", jsonText: JSON.stringify(menu, null, 2) }]);
      }
    }).catch(e => { if (active) setFormError(e.message || "Unable to load menu details."); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [dialog]);
  function open(kind, item) { if ((kind === "EDIT" || kind === "DELETE") && !canEdit) return; setDialog({ kind, item }); setDetail(null); setDetailLoading(false); setNeedsReview(false); setFormError(""); setEntries(kind === "CREATE" ? [makeEntry(today)] : []); setExpanded(0); }
  function refresh() { setRevision(v => v + 1); }
  function apply() { if (fromDate && toDate && fromDate > toDate) { setError("To date cannot be before from date."); return; } setPage(1); setQuery({ fromDate, toDate }); }
  function changeEntry(index, patch) { setEntries(current => current.map((entry, i) => i === index ? { ...entry, ...patch } : entry)); }
  function changeField(index, key, value) {
    setEntries(current => current.map((entry, i) => {
      if (i !== index) return entry;
      const menu = { ...entry.menu }; if (value.trim()) menu[key] = value; else delete menu[key];
      return { ...entry, menu };
    }));
  }
  function toggleJson(index) {
    const entry = entries[index];
    if (entry.advanced) {
      try {
        const menu = parseMenu(entry.jsonText);
        if (!menu || typeof menu !== "object" || Array.isArray(menu)) throw new Error("Use a JSON object to switch to dish fields. Arrays can be edited in JSON mode.");
        changeEntry(index, { menu, advanced: false }); setFormError("");
      } catch (e) { setFormError(e.message); }
    } else changeEntry(index, { advanced: true, jsonText: JSON.stringify(entry.menu, null, 2) });
  }
  function addDate() {
    if (entries.length >= 22) return;
    let date = entries[entries.length - 1]?.date || today;
    const used = new Set(entries.map(item => item.date));
    do { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 1); date = localDateValue(next); } while (used.has(date));
    setExpanded(entries.length); setEntries(current => [...current, makeEntry(date)]);
  }
  async function save() {
    if (inFlight.current || needsReview || !manager || (dialog?.kind !== "CREATE" && !canEdit)) return;
    let body;
    try {
      const values = entries.map(entry => ({ date: entry.date, menu: entry.advanced ? entry.jsonText : entry.menu }));
      if (dialog.kind !== "DELETE") body = dialog.kind === "CREATE" ? createMenusPayload(values) : updateMenuPayload(values[0]);
    } catch (e) { setFormError(e.message); return; }
    inFlight.current = true; setSaving(true); setFormError("");
    try {
      if (dialog.kind === "DELETE") await fmbApi.deleteMenu(dialog.item.menuId);
      else if (dialog.kind === "EDIT") await fmbApi.updateMenu(dialog.item.menuId, body);
      else {
        const result = await fmbApi.createMenu(body);
        if (Number(result?.failedCount) > 0) { setNeedsReview(true); refresh(); setFormError("Some menus could not be saved. Close this form and review the refreshed menu list before retrying unsaved dates."); return; }
      }
      setSuccess(dialog.kind === "DELETE" ? "Menu deleted." : dialog.kind === "EDIT" ? "Menu updated." : `${entries.length} ${entries.length === 1 ? "menu" : "menus"} saved.`);
      setDialog(null); setPage(1); refresh();
    } catch (e) { if (dialog.kind === "CREATE") { setNeedsReview(true); refresh(); } setFormError(`${e.message || "Unable to save menu."}${dialog.kind === "CREATE" ? " Close this form and review the refreshed menu list before retrying unsaved dates." : ""}`); }
    finally { inFlight.current = false; setSaving(false); }
  }
  return <View>
    <View style={ui.heading}><View style={ui.flex}><Text style={ui.title}>FMB menus</Text><Text style={ui.meta}>A menu for every serving day.</Text></View>{manager ? <Button title="Add menus" onPress={() => open("CREATE")} /> : null}</View>
    <Notice>{success}</Notice>
    <Card><View style={ui.filters}><View style={ui.filter}><DatePickerField label="From date" value={fromDate} onChange={setFrom} /></View><View style={ui.filter}><DatePickerField label="To date" value={toDate} onChange={setTo} /></View><View style={[ui.actions, { marginBottom: spacing.md }]}><Button title="Apply" compact onPress={apply} /><Button title="All dates" compact variant="outline" onPress={() => { setFrom(""); setTo(""); setQuery({}); setPage(1); }} /><Button title="Refresh" compact variant="ghost" onPress={refresh} /></View></View></Card>
    <Notice error>{error}</Notice>{error ? <Button title="Retry menus" variant="outline" onPress={refresh} /> : null}
    {loading ? <ActivityIndicator color={colors.primary} /> : (data?.items || []).map(item => <Card key={item.menuId}>
      <View style={ui.heading}><View style={ui.flex}><Text style={ui.title}>{formatDay(item.menuDate)}</Text><Text style={ui.meta}>{item.updatedByName ? `Updated by ${item.updatedByName}` : `Created by ${item.createdByName || "FMB team"}`} · {formatTime(item.updatedAt || item.createdAt)}</Text></View><View style={ui.actions}><Button title="Details" compact variant="outline" onPress={() => open("DETAIL", item)} />{canEdit ? <><Button title="Edit" compact variant="outline" onPress={() => open("EDIT", item)} /><Button title="Delete" compact variant="ghost" onPress={() => open("DELETE", item)} /></> : null}</View></View>
      <MenuContent value={item.menuJson} />{manager ? <InlineHistory key={`${item.menuId}-${revision}`} kind="MENU" id={item.menuId} /> : null}
    </Card>)}
    {!loading && !error && !data?.items?.length ? <Card><Empty title="No menus for these dates" caption={manager ? "Add a menu or choose a different date range." : "Check back when the FMB team publishes a menu."} /></Card> : null}
    <Pager page={page} pages={Math.max(1, data?.totalPages || 1)} total={data?.totalCount || 0} loading={loading} onChange={setPage} />
    <FmbSheet visible={Boolean(dialog)} title={dialog?.kind === "CREATE" ? "Add date-wise menus" : dialog?.kind === "EDIT" ? "Edit menu" : dialog?.kind === "DELETE" ? "Delete menu" : "Menu details"} saving={saving} wide onClose={() => setDialog(null)} action={dialog?.kind === "DETAIL" ? null : { title: dialog?.kind === "DELETE" ? "Delete menu" : "Save menus", variant: dialog?.kind === "DELETE" ? "danger" : "primary", onPress: save, disabled: needsReview || !manager || (dialog?.kind === "EDIT" && (detailLoading || !detail)) }}>
      {dialog?.kind === "DELETE" ? <Notice error>Delete the menu for {formatDay(dialog.item.menuDate)}? This cannot be undone.</Notice> : detailLoading ? <ActivityIndicator color={colors.primary} /> : dialog?.kind === "DETAIL" ? detail ? <View><Text style={ui.title}>{formatDay(detail.menuDate)}</Text><MenuContent value={detail.menuJson} /><Text style={ui.meta}>Created by {detail.createdByName || "FMB team"} · {formatTime(detail.createdAt)}</Text>{detail.updatedByName ? <Text style={ui.meta}>Updated by {detail.updatedByName} · {formatTime(detail.updatedAt)}</Text> : null}</View> : null : <View>
        <Text style={[ui.meta, { marginBottom: spacing.md }]}>Only the date is required. All dishes and remarks are optional.{dialog?.kind === "CREATE" ? " Add up to 22 dates in one submission." : ""}</Text>
        {dialog?.kind === "CREATE" ? <Button title={`+ Add another date (${entries.length}/22)`} variant="outline" style={{ marginBottom: spacing.md }} disabled={saving || entries.length >= 22} onPress={addDate} /> : null}
        {entries.map((entry, index) => <View key={index} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
          <View style={ui.heading}><Pressable accessibilityRole="button" accessibilityLabel={`Expand menu ${index + 1}`} onPress={() => setExpanded(index)} style={ui.flex}><Text style={ui.name}>Menu {index + 1} · {formatDay(entry.date)}</Text><Text style={ui.meta}>{expanded === index ? "Editing this date" : "Tap to edit"}</Text></Pressable>{entries.length > 1 ? <Button title="Remove date" compact variant="ghost" disabled={saving} onPress={() => { setEntries(current => current.filter((_, i) => i !== index)); setExpanded(Math.max(0, index - 1)); }} /> : null}</View>
          {expanded === index ? <View>
            <DatePickerField label="Menu date" required value={entry.date} onChange={date => changeEntry(index, { date })} />
            <View style={[ui.actions, { marginBottom: spacing.md }]}><Button title={entry.advanced ? "Use dish fields" : "Edit full JSON"} compact variant="outline" disabled={saving} onPress={() => toggleJson(index)} /></View>
            {entry.advanced ? <Input label="Menu JSON (object or array)" value={entry.jsonText} onChangeText={jsonText => changeEntry(index, { jsonText })} multiline numberOfLines={12} autoCapitalize="none" autoCorrect={false} editable={!saving} style={{ minHeight: 220, textAlignVertical: "top" }} /> : <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md }}>
              {MENU_FIELDS.map(([key, label]) => <View key={key} style={{ width: phone ? "100%" : "48%" }}><Input label={label} placeholder="Optional" value={typeof entry.menu[key] === "string" ? entry.menu[key] : entry.menu[key] == null ? "" : JSON.stringify(entry.menu[key])} onChangeText={value => changeField(index, key, value)} editable={!saving} /></View>)}
            </View>}
          </View> : null}
        </View>)}
      </View>}
      <Notice error>{formError}</Notice>
    </FmbSheet>
  </View>;
}
