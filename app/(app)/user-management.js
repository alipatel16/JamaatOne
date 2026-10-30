import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Redirect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { accountsApi } from "../../src/api/accountsApi";
import { usersApi } from "../../src/api/usersApi";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import MultiSelect from "../../src/components/MultiSelect";
import RemoteMumineenSelect from "../../src/components/RemoteMumineenSelect";
import RemotePagedSelect from "../../src/components/RemotePagedSelect";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import { canManageUsers, isAamil, isFmbAdmin, isCommitteeMember, hasRole } from "../../src/constants/roles";
import { roleGrantPayload } from "../../src/utils/fmbWorkflows";
import RoleAssignmentPanel from "../../src/components/RoleAssignmentPanel";
import CashTransfersPanel from "../../src/components/CashTransfersPanel";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radius, spacing } from "../../src/theme";

const PAGE_SIZE = 20;
const committeePage = (pageNumber, search) => usersApi.getCommitteeMembers({ pageNumber, pageSize: PAGE_SIZE, search });
const fmbPage = (pageNumber, search) => usersApi.getFmbUsers({ pageNumber, pageSize: PAGE_SIZE, search });
const EMPTY_FORM = { userId: null, muminId: "", itsNo: "", name: "", password: "", isActive: "true", categoryIds: [], isFmbAdmin: false };
const FMB_CONFIG = {
  label: "FMB Users", singular: "FMB User", caption: "FMB membership and admin access.",
  list: filters => usersApi.getFmbUsers(filters), get: id => usersApi.getFmbUser(id),
  create: payload => usersApi.createFmbUser(payload), update: (id, payload) => usersApi.updateFmbUser(id, payload),
  remove: id => usersApi.deleteFmbUser(id)
};

const COMMITTEE_CONFIG = {
  label: "Committee Members",
  singular: "Committee Member",
  caption: "Operational access across Jamaat modules without destructive delete actions.",
  list: filters => usersApi.getCommitteeMembers(filters),
  get: id => usersApi.getCommitteeMember(id),
  create: payload => usersApi.createCommitteeMember(payload),
  update: (id, payload) => usersApi.updateCommitteeMember(id, payload),
  remove: id => usersApi.deleteCommitteeMember(id)
};

function muminName(item) {
  if (!item) return "";
  return (
    item.fullName ||
    [item.firstName, item.fatherName, item.surname].filter(Boolean).join(" ") ||
    item.name ||
    ""
  ).trim();
}

async function confirmDelete(type, name) {
  const message = `Delete ${name || `this ${type}`}?`;
  if (Platform.OS === "web") {
    return globalThis.confirm?.(`Delete ${type}\n\n${message}`) ?? false;
  }
  return new Promise(resolve => {
    Alert.alert(`Delete ${type}`, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) }
    ]);
  });
}

export default function UserManagementScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const desktop = width >= 1024;
  const wide = width >= 1280;
  const narrow = width < 390;
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedMumin, setSelectedMumin] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const aamil = isAamil(user);
  const [section, setSection] = useState(aamil ? "COMMITTEE" : "FMB");
  const fmbSection = section === "FMB" || !aamil;
  const [editingRecord, setEditingRecord] = useState(null);
  const [roleTarget, setRoleTarget] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [createMode, setCreateMode] = useState("NEW");
  const [existingAccount, setExistingAccount] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const listRequest = useRef(0);

  const config = fmbSection ? FMB_CONFIG : COMMITTEE_CONFIG;
  useEffect(() => {
    listRequest.current += 1;
    setItems([]); setForm(EMPTY_FORM); setSelectedMumin(null); setEditingRecord(null);
    setRoleTarget(null); setTransferTarget(null);
    setFormVisible(false); setExistingAccount(null); setCreateMode("NEW"); setActionTarget(null);
    return () => { listRequest.current += 1; };
  }, [fmbSection, aamil]);
  const statusOptions = useMemo(() => [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
  ], []);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter(item => item?.isActive !== false)
        .map(item => ({
          label: item.categoryName || `Category ${item.categoryId}`,
          value: String(item.categoryId),
          searchText: item.jamaatName || ""
        })),
    [categories]
  );

  useEffect(() => {
    if (!aamil) return undefined;
    let active = true;

    (async () => {
      try {
        setCategoriesLoading(true);
        const result = await accountsApi.getPaymentCategories(user?.jamaatId);
        if (active) {
          setCategories(
            (Array.isArray(result) ? result : []).filter(item => item?.isActive !== false)
          );
        }
      } catch (requestError) {
        if (active) {
          setCategories([]);
          setError(requestError.message || "Unable to load payment categories.");
        }
      } finally {
        if (active) setCategoriesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.jamaatId, aamil]);

  useEffect(() => {
    if (!canManageUsers(user)) return;
    const timer = setTimeout(() => load(pageNumber), search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [pageNumber, search, user?.roles, user?.role, fmbSection]);

  if (!canManageUsers(user)) return <Redirect href="/(app)" />;

  async function load(page = 1) {
    const request = ++listRequest.current;
    try {
      setLoading(true);
      setError("");
      const result = await config.list({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined
      });
      if (request !== listRequest.current) return;
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
      setTotalCount(Number(result?.totalCount || 0));
    } catch (requestError) {
      if (request !== listRequest.current) return;
      setItems([]);
      setError(requestError.message || `Unable to load ${config.label.toLowerCase()}.`);
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  }

  function resetForm() {
    setFormVisible(false); setExistingAccount(null); setCreateMode("NEW");
    setForm(EMPTY_FORM);
    setSelectedMumin(null);
    setEditingRecord(null);
    setError("");
  }

  async function edit(item) {
    try {
      setError("");
      const detail = await config.get(item.userId);
      const record = detail || item;
      if (fmbSection && !aamil && (record.isFmbAdmin || isFmbAdmin(record))) {
        setError("FMB Admin accounts can only be changed by Aamil."); return;
      }
      setEditingRecord(record);
      setFormVisible(true);
      setSelectedMumin(null);
      setForm({
        userId: record.userId,
        muminId: "",
        itsNo: record.itsNo || "",
        name: record.name || "",
        password: "",
        isFmbAdmin: record.isFmbAdmin || isFmbAdmin(record),
        isActive: String(record.isActive !== false),
        categoryIds: (Array.isArray(record.categories) ? record.categories : [])
          .map(category => String(category.categoryId))
      });
    } catch (requestError) {
      setError(requestError.message || `Unable to load ${config.singular} details.`);
    }
  }

  async function submit() {
    if (saving) return;
    const editing = Boolean(form.userId);
    if (!editing && createMode === "EXISTING") {
      if (!aamil) return;
      try {
        const grant = roleGrantPayload(fmbSection ? "FMB" : "COMMITTEE", existingAccount, form.categoryIds);
        setSaving(true); setError("");
        await usersApi.grantRole(grant.userId, grant.body);
        resetForm();
        if (pageNumber === 1) await load(1); else setPageNumber(1);
      } catch (error) { setError(error.message || "Unable to assign access."); }
      finally { setSaving(false); }
      return;
    }
    if (!editing && !form.muminId) {
      setError("Search and select a Mumineen member.");
      return;
    }
    if (!editing && !form.itsNo.trim()) {
      setError("The selected Mumineen record does not have an ITS number.");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!editing && !form.password) {
      setError("Temporary password is required.");
      return;
    }
    if (!fmbSection && !form.categoryIds.length) { setError("Select at least one payment category."); return; }
    if (!editing && form.password.length < 8) { setError("Password must have at least 8 characters."); return; }

    try {
      setSaving(true);
      setError("");
      if (aamil && editing && (!fmbSection || isCommitteeMember(editingRecord))) {
        const previous = (editingRecord?.categories || []).map(item => String(item.categoryId)).sort().join(",");
        const changed = (!fmbSection && [...form.categoryIds].sort().join(",") !== previous) || form.isActive === "false";
        if (changed && !(await canChangeHoldings(editingRecord))) return;
      }
      if (editing) {
        await config.update(form.userId, {
          name: form.name,
          isActive: form.isActive === "true",
          categoryIds: form.categoryIds.map(value => Number(value)),
          ...(fmbSection && aamil ? { isFmbAdmin: form.isFmbAdmin } : {})
        });
      } else {
        await config.create({
          itsNo: form.itsNo,
          name: form.name,
          password: form.password,
          categoryIds: form.categoryIds.map(value => Number(value)),
          ...(fmbSection && aamil ? { isFmbAdmin: form.isFmbAdmin } : {})
        });
      }
      resetForm();
      if (pageNumber === 1) await load(1);
      else setPageNumber(1);
    } catch (requestError) {
      setError(requestError.message || `Unable to ${editing ? "update" : "create"} ${config.singular}.`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (fmbSection && !aamil && (item.isFmbAdmin || isFmbAdmin(item))) return;
    if (!(await confirmDelete(config.singular, item.name))) return;
    try {
      setDeletingId(item.userId);
      setError("");
      if (aamil && (!fmbSection || isCommitteeMember(item)) && !(await canChangeHoldings(item))) return;
      await config.remove(item.userId);
      if (form.userId === item.userId) resetForm();
      await load(pageNumber);
    } catch (requestError) {
      setError(requestError.message || `Unable to delete ${config.singular}.`);
    } finally {
      setDeletingId(null);
    }
  }

  async function canChangeHoldings(item) {
    const holdings = await accountsApi.getUserHoldings(item.userId);
    if (holdings?.hasPendingMoney) {
      setFormVisible(false);
      setError("This member still holds cash or cheques. Transfer their holdings before changing categories, deactivating, or deleting them.");
      setTransferTarget(item);
      return false;
    }
    return true;
  }

  return (
    <Screen contentStyle={styles.page}>
      <View style={[styles.pageHeader, !desktop && styles.pageHeaderCompact]}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{aamil ? "AAMIL ACCESS" : "FMB ADMIN ACCESS"}</Text>
          <Text style={[styles.pageTitle, phone && styles.pageTitlePhone]}>User Management</Text>
          <Text style={styles.pageSubtitle}>
            {aamil ? "Manage your Jamaat’s people, roles and category access." : "Manage your Jamaat’s FMB user accounts."}
          </Text>
        </View>
        <Button title={`Add ${config.singular}`} onPress={() => { resetForm(); setFormVisible(true); }} style={!desktop && styles.addButtonCompact} />
      </View>

      {aamil ? <View style={styles.sectionTabs}>
        {[
          ["COMMITTEE", "Committee Members", "account-group-outline"],
          ["FMB", "FMB Users", "silverware-fork-knife"]
        ].map(([value, label, icon]) => {
          const active = fmbSection ? value === "FMB" : value === "COMMITTEE";
          return <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.sectionTab, phone && styles.sectionTabPhone, active && styles.sectionTabActive]} onPress={() => { resetForm(); setSearch(""); setPageNumber(1); setSection(value); }}>
            <MaterialCommunityIcons name={icon} size={18} color={active ? colors.primaryStrong : colors.muted} />
            <Text style={[styles.sectionTabText, active && styles.sectionTabTextActive]}>{phone && value === "COMMITTEE" ? "Committee" : label}</Text>
          </Pressable>;
        })}
      </View> : null}

      {error && !formVisible ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <Card style={styles.directoryCard}>
        <View style={[styles.directoryHeader, phone && styles.directoryHeaderPhone]}>
          <View style={styles.flex}>
            <View style={styles.directoryTitleRow}>
              <Text style={styles.cardTitle}>{config.label}</Text>
              <View style={styles.totalBadge}><Text style={styles.totalBadgeText}>{totalCount}</Text></View>
            </View>
            <Text style={styles.directoryCaption}>{fmbSection ? "FMB membership and admin access." : "Members with assigned Jamaat payment categories."}</Text>
          </View>
          {desktop ? <Text style={styles.accessNote}><MaterialCommunityIcons name="shield-check-outline" size={15} color={colors.muted} /> Role-based access</Text> : null}
        </View>
        <View style={styles.directoryToolbar}>
          <View style={[styles.searchField, desktop && styles.searchFieldDesktop]}>
            <Input label="Search users" autoComplete="off" value={search} placeholder={phone ? "Name or ITS number" : "Search by name or ITS number"} onChangeText={value => { setSearch(value); setPageNumber(1); }} />
          </View>
          <Button title="Refresh" compact variant="outline" onPress={() => load(pageNumber)} disabled={loading} style={styles.refreshButton} />
        </View>

        {desktop ? <View style={styles.tableHeading}>
          <Text style={[styles.columnLabel, styles.memberColumn]}>MEMBER</Text>
          <Text style={[styles.columnLabel, styles.rolesColumn]}>ROLES</Text>
          {!fmbSection ? <Text style={[styles.columnLabel, styles.categoriesColumn]}>CATEGORY ACCESS</Text> : null}
          <Text style={[styles.columnLabel, styles.statusColumn]}>STATUS</Text>
          {wide ? <Text style={[styles.columnLabel, styles.activityColumn]}>LAST SIGN-IN</Text> : null}
          <Text style={[styles.columnLabel, styles.actionsColumn]}>ACTIONS</Text>
        </View> : null}

        {loading ? <ActivityIndicator color={colors.primaryStrong} style={styles.loader} /> : null}
        {!loading && !items.length ? <View style={styles.empty}>
          <MaterialCommunityIcons name="account-search-outline" size={34} color={colors.muted} />
          <Text style={styles.emptyTitle}>No {config.label.toLowerCase()} found</Text>
          <Text style={styles.emptyText}>{search.trim() ? "Try another name or ITS number." : "Add a user to get started."}</Text>
        </View> : null}

        {items.map(item => {
          const canChange = aamil || !(item.isFmbAdmin || isFmbAdmin(item));
          const roles = item.roles?.length ? item.roles : [{ roleName: item.roleName || config.singular }];
          const roleTags = <View style={styles.roleTags}>{roles.map(role => <View key={role.roleName} style={styles.roleTag}><Text style={styles.roleTagText}>{String(role.roleName).replace(/_/g, " ")}</Text></View>)}</View>;
          const statusBadge = <View style={[styles.badge, item.isActive === false && styles.badgeInactive]}><View style={[styles.statusDot, item.isActive === false && styles.statusDotInactive]} /><Text style={[styles.badgeText, item.isActive === false && styles.badgeTextInactive]}>{item.isActive === false ? "Inactive" : "Active"}</Text></View>;
          const categoryText = item.categories?.length ? item.categories.map(category => category.categoryName || `#${category.categoryId}`).join(", ") : "—";
          const identity = <View style={styles.memberIdentity}><View style={styles.avatar}><Text style={styles.avatarText}>{String(item.name || config.singular).slice(0, 1).toUpperCase()}</Text></View><View style={styles.flex}><Text style={styles.userName}>{item.name || `Unnamed ${config.singular}`}</Text><Text selectable style={styles.meta}>ITS {item.itsNo || "—"}</Text></View></View>;
          return desktop ? <View key={String(item.userId)} style={styles.tableRow}>
            <View style={styles.memberColumn}>{identity}</View>
            <View style={styles.rolesColumn}>{roleTags}</View>
            {!fmbSection ? <View style={styles.categoriesColumn}><Text style={styles.categoryValue}>{categoryText}</Text></View> : null}
            <View style={styles.statusColumn}>{statusBadge}</View>
            {wide ? <View style={styles.activityColumn}><Text style={styles.meta}>{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not signed in yet"}</Text></View> : null}
            <View style={styles.actionsColumn}>{canChange ? <View style={styles.desktopActions}><Button title="Edit" compact variant="outline" disabled={saving || Boolean(deletingId)} onPress={() => edit(item)} /><Pressable accessibilityRole="button" accessibilityLabel={`More actions for ${item.name || "user"}`} style={styles.moreButton} disabled={saving || Boolean(deletingId)} onPress={() => setActionTarget(item)}><MaterialCommunityIcons name="dots-horizontal" size={21} color={colors.textSoft} /></Pressable></View> : <Text style={styles.meta}>Aamil only</Text>}</View>
          </View> : <View key={String(item.userId)} style={styles.mobileUserCard}>
            <View style={styles.mobileIdentityRow}><View style={styles.flex}>{identity}</View>{statusBadge}</View>
            <View style={styles.mobileRoleRow}>{roleTags}</View>
            {!fmbSection && item.categories?.length ? <View style={styles.mobileCategories}><MaterialCommunityIcons name="tag-outline" size={15} color={colors.muted} /><Text style={styles.categoryValue}>{categoryText}</Text></View> : null}
            <View style={styles.mobileCardFooter}><Text style={styles.smallMeta}>{item.lastLoginAt ? `Last sign-in ${new Date(item.lastLoginAt).toLocaleDateString("en-IN")}` : "Not signed in yet"}</Text>{canChange ? <Button title="Manage user" compact variant="outline" disabled={saving || Boolean(deletingId)} onPress={() => setActionTarget(item)} /> : <Text style={styles.meta}>Aamil only</Text>}</View>
          </View>;
        })}

        <View style={styles.pagination}>
          <Text style={styles.pageText}>{totalCount ? `${(pageNumber - 1) * PAGE_SIZE + 1}–${Math.min(pageNumber * PAGE_SIZE, totalCount)} of ${totalCount} users` : "0 users"}</Text>
          <View style={styles.paginationControls}>
            <Button title="Previous" compact variant="outline" disabled={loading || pageNumber <= 1} onPress={() => setPageNumber(current => Math.max(1, current - 1))} />
            <Text style={styles.pageText}>{pageNumber} / {totalPages}</Text>
            <Button title="Next" compact variant="outline" disabled={loading || pageNumber >= totalPages} onPress={() => setPageNumber(current => Math.min(totalPages, current + 1))} />
          </View>
        </View>
      </Card>
      <Modal visible={Boolean(actionTarget)} transparent animationType="slide" onRequestClose={() => setActionTarget(null)}>
        <View style={[styles.modalBackdrop, phone && styles.modalBackdropPhone]}><View style={styles.actionSheet}>
          <Text style={styles.cardTitle}>{actionTarget?.name}</Text>
          <Text style={styles.cardSubtitle}>ITS {actionTarget?.itsNo}</Text>
          <Button title="Edit user" variant="outline" onPress={() => { const target = actionTarget; setActionTarget(null); edit(target); }} />
          {aamil ? <Button title="Assign additional access" variant="outline" onPress={() => { setRoleTarget(actionTarget); setActionTarget(null); }} /> : null}
          {aamil && (!fmbSection || isCommitteeMember(actionTarget)) ? <Button title="Transfer holdings" variant="outline" onPress={() => { setTransferTarget(actionTarget); setActionTarget(null); }} /> : null}
          <Button title="Delete user" variant="danger" onPress={() => { const target = actionTarget; setActionTarget(null); remove(target); }} />
          <Button title="Cancel" variant="ghost" onPress={() => setActionTarget(null)} />
        </View></View>
      </Modal>
      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => !saving && resetForm()}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalBackdrop, phone && styles.modalBackdropPhone]}>
          <View style={[styles.formSheet, phone && styles.formSheetPhone]}>
            <View style={[styles.formSheetHeader, phone && styles.formSheetHeaderPhone]}>
              <View style={styles.flex}>
                <Text style={styles.cardEyebrow}>{form.userId ? "EDIT USER" : createMode === "EXISTING" ? "ADD ACCESS" : "CREATE USER"}</Text>
                <Text style={styles.formSheetTitle}>{form.userId ? `Edit ${config.singular}` : `Add ${config.singular}`}</Text>
              </View>
              <Button title="Close" compact variant="ghost" disabled={saving} onPress={resetForm} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <Card elevated={false} style={[styles.formCard, phone && styles.formCardPhone]}>
          <Text style={styles.cardSubtitle}>
            {form.userId
              ? (fmbSection ? "Update the FMB user's name and account status." : "Update the user name, account status and payment-category access.")
              : createMode === "EXISTING" ? "Add access to an existing account without creating another user."
              : (fmbSection ? "Select a member and set a temporary password for FMB access." : "Search Mumineen, assign payment-category access and set a temporary password.")}
          </Text>

          {!form.userId && aamil ? <View style={styles.modeTabs}>
            <Button title="New user" compact variant={createMode === "NEW" ? "primary" : "outline"} disabled={saving} onPress={() => { setCreateMode("NEW"); setExistingAccount(null); setError(""); }} />
            <Button title="Existing account" compact variant={createMode === "EXISTING" ? "primary" : "outline"} disabled={saving} onPress={() => { setCreateMode("EXISTING"); setSelectedMumin(null); setForm(EMPTY_FORM); setError(""); }} />
          </View> : null}
          {!form.userId && createMode === "EXISTING" ? <>
            <Text style={styles.cardSubtitle}>{fmbSection ? "Select a committee member to add FMB User access. Their existing account and password stay the same." : "Select an FMB user and choose their committee payment categories."}</Text>
            <RemotePagedSelect label={fmbSection ? "Existing committee member" : "Existing FMB user"} keyField="userId" fetchPage={fmbSection ? committeePage : fmbPage} selected={existingAccount ? [existingAccount] : []} onChange={items => setExistingAccount(items[0] || null)} disabled={saving} exclude={item => hasRole(item, fmbSection ? "FMB_USER" : "COMMITTEE_MEMBER")} />
          </> : !form.userId ? (
            <RemoteMumineenSelect
              label="Mumineen member"
              value={form.muminId}
              initialItem={selectedMumin}
              placeholder="Search name, ITS ID, mobile or family ID"
              onChange={(muminId, item) => {
                setSelectedMumin(item || null);
                setForm(current => ({
                  ...current,
                  muminId: String(muminId || ""),
                  itsNo: String(item?.itsId || "").trim(),
                  name: muminName(item)
                }));
              }}
            />
          ) : (
            <>
              <Input
                label="ITS number"
                value={form.itsNo}
                editable={false}
                keyboardType="number-pad"
                autoCapitalize="none"
                helperText="ITS number is fixed after creation."
              />
              <Input
                label="Name"
                value={form.name}
                autoCapitalize="words"
                placeholder="Enter full name"
                onChangeText={name => setForm(current => ({ ...current, name }))}
              />
            </>
          )}
          {!fmbSection ? <MultiSelect
            label="Payment categories"
            values={form.categoryIds}
            options={categoryOptions}
            onChange={categoryIds => setForm(current => ({ ...current, categoryIds }))}
            placeholder={categoriesLoading ? "Loading payment categories..." : "Select payment categories"}
            searchPlaceholder="Search payment categories"
            disabled={categoriesLoading}
          /> : aamil && (form.userId || createMode === "NEW") ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.isFmbAdmin }} disabled={saving} style={styles.checkbox} onPress={() => setForm(current => ({ ...current, isFmbAdmin: !current.isFmbAdmin }))}>
            <Text style={styles.checkboxMark}>{form.isFmbAdmin ? "☑" : "☐"}</Text><Text style={styles.checkboxLabel}>Also give FMB Admin access</Text>
          </Pressable> : null}
          {!form.userId && createMode === "NEW" ? (
            <Input
              label="Temporary password"
              autoComplete="new-password"
              textContentType="newPassword"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.password}
              secureTextEntry
              placeholder="Enter password"
              onChangeText={password => setForm(current => ({ ...current, password }))}
            />
          ) : form.userId ? (
            <Select
              label="Status"
              value={form.isActive}
              options={statusOptions}
              onChange={isActive => setForm(current => ({ ...current, isActive }))}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}


        </Card>
            </ScrollView>
          <View style={[styles.formActions, narrow && styles.formActionsNarrow]}>
            {formVisible ? (
              <Button title="Cancel" variant="outline" onPress={resetForm} disabled={saving} style={[styles.actionButton, !phone && styles.actionButtonDesktop]} />
            ) : null}
            <Button
              title={form.userId ? "Save changes" : createMode === "EXISTING" ? "Grant access" : "Create user"}
              loading={saving}
              onPress={submit}
              style={[styles.actionButton, !phone && styles.primaryActionDesktop]}
            />
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={Boolean(roleTarget)} transparent animationType="fade" onRequestClose={() => setRoleTarget(null)}>
        <View style={styles.modalBackdrop}><ScrollView style={styles.modalSheet} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
          {aamil && roleTarget ? <RoleAssignmentPanel target={roleTarget} categories={categories} onCancel={() => setRoleTarget(null)} onSaved={() => { setRoleTarget(null); load(pageNumber); }} /> : null}
        </ScrollView></View>
      </Modal>
      <Modal visible={Boolean(transferTarget)} transparent animationType="fade" onRequestClose={() => setTransferTarget(null)}>
        <View style={styles.modalBackdrop}><ScrollView style={styles.modalSheet} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
          <Button title="Close" variant="outline" onPress={() => setTransferTarget(null)} />
          {aamil && transferTarget ? <CashTransfersPanel initialSender={transferTarget} onTransferred={() => load(pageNumber)} /> : null}
        </ScrollView></View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { maxWidth: 1440 },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.lg, marginBottom: spacing.lg },
  pageHeaderCompact: { alignItems: "stretch", flexDirection: "column", gap: spacing.md },
  addButtonCompact: { alignSelf: "flex-start" },
  sectionTab: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingHorizontal: spacing.lg, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: "transparent" },
  sectionTabPhone: { flex: 1, paddingHorizontal: spacing.xs },
  sectionTabActive: { backgroundColor: colors.surface, borderColor: colors.border },
  sectionTabText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  sectionTabTextActive: { color: colors.primaryStrong },
  directoryTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  totalBadge: { paddingHorizontal: 9, paddingVertical: 3, backgroundColor: colors.primarySoft, borderRadius: radius.pill },
  totalBadgeText: { color: colors.primaryStrong, fontSize: 12, fontWeight: "800" },
  directoryCaption: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  accessNote: { color: colors.muted, fontSize: 12 },
  directoryToolbar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginTop: spacing.md },
  searchField: { flex: 1, minWidth: 0 },
  searchFieldDesktop: { maxWidth: 440 },
  refreshButton: { minHeight: 52, marginBottom: spacing.md },
  tableHeading: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceMuted, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  columnLabel: { color: colors.muted, fontWeight: "800", fontSize: 10, letterSpacing: 0.6 },
  memberColumn: { flex: 2, minWidth: 0 },
  rolesColumn: { flex: 1.2, minWidth: 0 },
  categoriesColumn: { flex: 1, minWidth: 0 },
  statusColumn: { width: 82, alignItems: "flex-start" },
  activityColumn: { width: 112 },
  actionsColumn: { width: 118 },
  tableRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, minHeight: 92 },
  memberIdentity: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  roleTags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  roleTag: { backgroundColor: colors.backgroundAlt, paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radius.sm, maxWidth: "100%" },
  roleTagText: { color: colors.textSoft, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  categoryValue: { color: colors.textSoft, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  statusDotInactive: { backgroundColor: colors.danger },
  desktopActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  moreButton: { minWidth: 40, minHeight: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  mobileUserCard: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  mobileIdentityRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  mobileRoleRow: { paddingLeft: 56 },
  mobileCategories: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, paddingLeft: 56 },
  mobileCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.xs },
  smallMeta: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  paginationControls: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  addButton: { marginBottom: spacing.md },
  sectionTabs: { flexDirection: "row", alignSelf: "flex-start", width: "100%", maxWidth: 400, padding: 4, borderRadius: radius.lg, backgroundColor: colors.backgroundAlt, marginBottom: spacing.lg },
  modeTabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  checkbox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  checkboxMark: { color: colors.primaryStrong, fontSize: 26 },
  checkboxLabel: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  modalBackdropPhone: { padding: 0, justifyContent: "flex-end" },
  formSheet: { width: "100%", maxWidth: 720, maxHeight: "90%", backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden" },
  formSheetPhone: { height: "100%", maxHeight: "100%", borderRadius: 0 },
  formContent: { paddingBottom: spacing.sm },
  sheetClose: { alignItems: "flex-end", paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  formSheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  formSheetHeaderPhone: { padding: spacing.md },
  formSheetTitle: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: 4 },
  actionSheet: { width: "100%", maxWidth: 500, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, gap: spacing.sm },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.overlay, padding: spacing.md },
  modalSheet: { width: "100%", maxWidth: 760, maxHeight: "90%", backgroundColor: colors.surface, borderRadius: radius.lg },
  heading: { marginBottom: spacing.lg },
  eyebrow: { color: colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  pageTitle: { color: colors.text, fontSize: 31, fontWeight: "900", marginTop: 4 },
  pageTitlePhone: { fontSize: 27 },
  pageSubtitle: { color: colors.muted, lineHeight: 20, marginTop: 5, maxWidth: 720 },
  tabsScroll: { marginBottom: spacing.md, flexGrow: 0 },
  tabs: { gap: spacing.xs, padding: 4, backgroundColor: colors.backgroundAlt, borderRadius: radius.lg },
  tab: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabText: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  tabTextActive: { color: colors.primaryStrong },
  roleIntro: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceTint, borderWidth: 1, borderColor: colors.primarySoftStrong, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  roleIntroPhone: { alignItems: "flex-start" },
  roleIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  roleIconText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  roleTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
  roleCaption: { color: colors.textSoft, marginTop: 3, lineHeight: 18, fontSize: 12 },
  grid: { width: "100%", gap: spacing.md },
  gridPhone: { flexDirection: "column", gap: spacing.sm },
  formCard: { width: "100%", borderWidth: 0, borderRadius: 0, marginBottom: 0 },
  formCardPhone: { width: "100%" },
  directoryCard: { width: "100%", minWidth: 0 },
  cardEyebrow: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  cardTitle: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: 4 },
  cardSubtitle: { color: colors.muted, marginTop: 5, marginBottom: spacing.md, lineHeight: 18, fontSize: 12 },
  error: { color: colors.danger, fontWeight: "700", marginBottom: spacing.md },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  formActionsNarrow: { flexDirection: "column" },
  actionButton: { flex: 1 },
  actionButtonDesktop: { flex: 0, minWidth: 130 },
  primaryActionDesktop: { flex: 0, minWidth: 160 },
  directoryHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  directoryHeaderPhone: { gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  loader: { marginVertical: spacing.lg },
  empty: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 16, textAlign: "center" },
  emptyText: { color: colors.muted, marginTop: 5, textAlign: "center" },
  userRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  userRowPhone: { alignItems: "flex-start", flexWrap: "wrap", gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 17 },
  userCopy: { flex: 1, minWidth: 150 },
  nameLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs },
  userName: { color: colors.text, fontWeight: "900", fontSize: 16, flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  categoryMeta: { color: colors.primaryStrong, fontSize: 11, fontWeight: "700", marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeInactive: { backgroundColor: colors.dangerSoft },
  badgeText: { color: colors.primaryStrong, fontSize: 10, fontWeight: "900" },
  badgeTextInactive: { color: colors.danger },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, flexShrink: 1, maxWidth: "100%" },
  rowActionsPhone: { width: "100%", paddingLeft: 0, flexWrap: "wrap" },
  pagination: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.md },
  pageText: { color: colors.muted, fontWeight: "800", fontSize: 12 }
});
