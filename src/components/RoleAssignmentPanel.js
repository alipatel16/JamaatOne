import React, { useState } from "react";
import { Text, View } from "react-native";
import { usersApi } from "../api/usersApi";
import { hasRole, normalizeRole } from "../constants/roles";
import { roleGrantPayload } from "../utils/fmbWorkflows";
import { colors, spacing } from "../theme";
import Button from "./Button";
import Select from "./Select";
import MultiSelect from "./MultiSelect";

export default function RoleAssignmentPanel({ target, categories, onSaved, onCancel }) {
  const roles = [{ roleId: 3, roleName: "Committee_Member" }, { roleId: 5, roleName: "FMB_User" }];
  const [roleId, setRoleId] = useState("");
  const [categoryIds, setCategoryIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const eligible = roles.filter(role => {
    const name = normalizeRole(role.roleName);
    return !hasRole(target, name);
  });
  const selected = eligible.find(role => String(role.roleId) === roleId);
  const committee = normalizeRole(selected?.roleName) === "COMMITTEE_MEMBER";
  async function save() {
    if (!selected || (committee && !categoryIds.length)) { setError("Select a role and its required payment categories."); return; }
    setBusy(true); setError("");
    try {
      const grant = roleGrantPayload(committee ? "COMMITTEE" : "FMB", target, categoryIds);
      await usersApi.grantRole(grant.userId, grant.body);
      onSaved();
    } catch (error) { setError(error.message || "Unable to assign role."); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: spacing.sm }}>
    <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>Assign role · {target.name}</Text>
    <Text style={{ color: colors.muted }}>Existing roles and passwords are retained. FMB Admin access can be changed from Edit FMB User.</Text>
    <Select label="Additional role" value={roleId} options={eligible.map(role => ({ value: String(role.roleId), label: role.roleName }))} onChange={id => { setRoleId(id); setCategoryIds([]); }} disabled={busy} />
    {committee ? <MultiSelect label="Payment categories" values={categoryIds} options={categories.map(item => ({ value: String(item.categoryId), label: item.categoryName }))} onChange={setCategoryIds} disabled={busy} /> : null}
    {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    <Button title="Assign role" loading={busy} onPress={save} disabled={!selected} />
    <Button title="Cancel" variant="outline" disabled={busy} onPress={onCancel} />
  </View>;
}
