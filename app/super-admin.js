import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Redirect, router } from "expo-router";

import { authApi } from "../src/api/authApi";
import { jamaatApi } from "../src/api/jamaatApi";
import { jamiatApi } from "../src/api/jamiatApi";
import Button from "../src/components/Button";
import ApiLogsPanel from "../src/components/ApiLogsPanel";
import Card from "../src/components/Card";
import Input from "../src/components/Input";
import LoadingView from "../src/components/LoadingView";
import PaymentSetupPanel from "../src/components/PaymentSetupPanel";
import Screen from "../src/components/Screen";
import Select from "../src/components/Select";
import { isSuperAdmin } from "../src/constants/roles";
import { useAuth } from "../src/context/AuthContext";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography
} from "../src/theme";

const TABS = [
  { id: "jamiat", label: "Jamiyat" },
  { id: "jamaat", label: "Jamaat" },
  { id: "aamil", label: "Aamil" },
  { id: "payment-categories", label: "Payment Categories" },
  { id: "payment-subcategories", label: "Payment Subcategories" },
  { id: "payment-fields", label: "Payment Fields" },
  { id: "payment-methods", label: "Payment Methods" },
  { id: "logs", label: "API Logs" }
];

const PAYMENT_SETUP_TABS = {
  "payment-categories": "categories",
  "payment-subcategories": "subcategories",
  "payment-fields": "fields",
  "payment-methods": "methods"
};

const EMPTY_JAMIAT_FORM = {
  jamiatId: null,
  name: "",
  isActive: true
};

const EMPTY_JAMAAT_FORM = {
  jamaatId: null,
  name: "",
  jamiatId: "",
  isActive: true
};

const EMPTY_AAMIL_FORM = {
  itsNo: "",
  name: "",
  password: "",
  roleId: "",
  jamaatId: ""
};

function getErrorMessage(error) {
  return (
    error?.apiMessage ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

async function confirmDelete(title, message) {
  if (Platform.OS === "web") {
    return globalThis.confirm?.(`${title}\n\n${message}`) ?? false;
  }

  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) }
    ]);
  });
}

function PageHeader({ user, onLogout, phone, narrow }) {
  if (phone) {
    return (
      <View style={[styles.header, styles.headerPhone, shadows.card]}>
        <View style={styles.mobileHeaderTop}>
          <View style={[styles.brandBlock, styles.brandBlockPhone]}>
            <View style={[styles.brandMark, narrow && styles.brandMarkNarrow]}>
              <Text style={styles.brandInitial}>J</Text>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.eyebrow}>JAMAATONE</Text>
              <Text style={styles.headerTitle}>Super Admin</Text>
            </View>
          </View>
          <Button
            title="Sign out"
            variant="outline"
            compact
            onPress={onLogout}
            style={styles.mobileSignOut}
          />
        </View>

        <View style={styles.mobileUserStrip}>
          <View style={styles.mobileUserAvatar}>
            <Text style={styles.mobileUserAvatarText}>{(user?.name || "S").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.mobileUserCopy}>
            <Text style={styles.mobileUserName} numberOfLines={1}>{user?.name || "Super Admin"}</Text>
            <Text style={styles.mobileUserMeta}>ITS {user?.itsNo || "-"}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.header, shadows.card]}>
      <View style={styles.brandBlock}>
        <View style={[styles.brandMark, narrow && styles.brandMarkNarrow]}>
          <Text style={styles.brandInitial}>J</Text>
        </View>
        <View style={styles.brandText}>
          <Text style={styles.eyebrow}>JAMAATONE</Text>
          <Text style={styles.headerTitle}>Super Admin</Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || "Super Admin"}</Text>
          <Text style={styles.userMeta}>ITS {user?.itsNo || "-"}</Text>
        </View>
        <Button
          title="Sign out"
          variant="outline"
          compact
          onPress={onLogout}
        />
      </View>
    </View>
  );
}

function TabBar({ activeTab, onChange, phone }) {
  const tabs = (
    <View style={[styles.tabs, phone && styles.tabsPhone]}>
      {TABS.map(tab => {
        const selected = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, phone && styles.tabPhone, selected && styles.tabSelected]}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (!phone) return tabs;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsScrollContent}
      style={styles.tabsScroll}
    >
      {tabs}
    </ScrollView>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? (
        <Text style={styles.sectionDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

function StatusBadge({ active }) {
  return (
    <View style={[styles.statusBadge, active ? styles.activeBadge : styles.inactiveBadge]}>
      <Text style={[styles.statusText, active ? styles.activeText : styles.inactiveText]}>
        {active ? "Active" : "Inactive"}
      </Text>
    </View>
  );
}

function EmptyState({ title, description }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

function JamiatPanel({ items, loading, onReload }) {
  const [form, setForm] = useState(EMPTY_JAMIAT_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const editing = form.jamiatId != null;

  function resetForm() {
    setForm(EMPTY_JAMIAT_FORM);
    setError("");
  }

  function startEdit(item) {
    setForm({
      jamiatId: item.jamiatId,
      name: item.name || "",
      isActive: Boolean(item.isActive)
    });
    setError("");
  }

  async function submit() {
    if (!form.name.trim()) {
      setError("Jamiyat name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editing) {
        await jamiatApi.update(form.jamiatId, {
          name: form.name.trim(),
          isActive: form.isActive
        });
      } else {
        // Swagger requires an array even when creating one Jamiyat.
        await jamiatApi.create(form.name.trim());
      }
      resetForm();
      await onReload();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const confirmed = await confirmDelete(
      "Delete Jamiyat?",
      `Delete ${item.name || "this Jamiyat"}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(item.jamiatId);
      setError("");
      await jamiatApi.remove(item.jamiatId);
      if (form.jamiatId === item.jamiatId) resetForm();
      await onReload();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <View style={styles.panelGrid}>
      <Card style={styles.formCard}>
        <SectionHeading
          eyebrow={editing ? "UPDATE" : "CREATE"}
          title={editing ? "Edit Jamiyat" : "Add Jamiyat"}
          description="Create a Jamiyat or update an existing record."
        />

        <Input
          label="Jamiyat name"
          value={form.name}
          onChangeText={name => setForm(current => ({ ...current, name }))}
          placeholder="Enter Jamiyat name"
          autoCapitalize="words"
        />

        {editing ? (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Active status</Text>
              <Text style={styles.switchHint}>
                Choose whether this Jamiyat should be available.
              </Text>
            </View>
            <Switch
              value={form.isActive}
              onValueChange={isActive =>
                setForm(current => ({ ...current, isActive }))
              }
            />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.formActions}>
          {editing ? (
            <Button
              title="Cancel"
              variant="outline"
              onPress={resetForm}
              style={styles.actionButton}
            />
          ) : null}
          <Button
            title={editing ? "Update Jamiyat" : "Create Jamiyat"}
            loading={saving}
            onPress={submit}
            style={styles.actionButton}
          />
        </View>
      </Card>

      <Card style={styles.listCard}>
        <View style={styles.listHeader}>
          <SectionHeading
            eyebrow="DIRECTORY"
            title="Jamiyat list"
            description={`${items.length} Jamiyat record${items.length === 1 ? "" : "s"}.`}
          />
          <Button
            title="Refresh"
            compact
            variant="outline"
            loading={loading}
            onPress={onReload}
          />
        </View>

        {!loading && items.length === 0 ? (
          <EmptyState
            title="No Jamiyat records"
            description="Create the first Jamiyat using the form."
          />
        ) : (
          items.map(item => (
            <View key={item.jamiatId} style={styles.recordRow}>
              <View style={styles.recordMain}>
                <Text style={styles.recordTitle}>{item.name || "Unnamed Jamiyat"}</Text>
                <Text style={styles.recordMeta}>ID {item.jamiatId}</Text>
              </View>
              <StatusBadge active={item.isActive} />
              <View style={styles.recordActions}>
                <Button
                  title="Edit"
                  compact
                  variant="outline"
                  onPress={() => startEdit(item)}
                />
                <Button
                  title="Delete"
                  compact
                  variant="danger"
                  loading={deletingId === item.jamiatId}
                  onPress={() => remove(item)}
                />
              </View>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function JamaatPanel({ items, jamiats, loading, onReload }) {
  const [form, setForm] = useState(EMPTY_JAMAAT_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const editing = form.jamaatId != null;

  const jamiatOptions = useMemo(
    () =>
      jamiats.map(item => ({
        label: `${item.name || "Unnamed Jamiyat"} · ID ${item.jamiatId}`,
        value: String(item.jamiatId)
      })),
    [jamiats]
  );

  function resetForm() {
    setForm(EMPTY_JAMAAT_FORM);
    setError("");
  }

  function startEdit(item) {
    setForm({
      jamaatId: item.jamaatId,
      name: item.name || "",
      jamiatId: String(item.jamiatId),
      isActive: Boolean(item.isActive)
    });
    setError("");
  }

  async function submit() {
    if (!form.name.trim()) {
      setError("Jamaat name is required.");
      return;
    }
    if (!form.jamiatId) {
      setError("Select the Jamiyat for this Jamaat.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editing) {
        await jamaatApi.update(form.jamaatId, {
          name: form.name.trim(),
          jamiatId: Number(form.jamiatId),
          isActive: form.isActive
        });
      } else {
        // Swagger requires an array even when creating one Jamaat.
        await jamaatApi.create(form.name.trim(), Number(form.jamiatId));
      }
      resetForm();
      await onReload();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const confirmed = await confirmDelete(
      "Delete Jamaat?",
      `Delete ${item.name || "this Jamaat"}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(item.jamaatId);
      setError("");
      await jamaatApi.remove(item.jamaatId);
      if (form.jamaatId === item.jamaatId) resetForm();
      await onReload();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <View style={styles.panelGrid}>
      <Card style={styles.formCard}>
        <SectionHeading
          eyebrow={editing ? "UPDATE" : "CREATE"}
          title={editing ? "Edit Jamaat" : "Add Jamaat"}
          description="Every Jamaat is linked to a Jamiyat through jamiatId."
        />

        <Input
          label="Jamaat name"
          value={form.name}
          onChangeText={name => setForm(current => ({ ...current, name }))}
          placeholder="Enter Jamaat name"
          autoCapitalize="words"
        />

        <Select
          label="Jamiyat"
          value={form.jamiatId}
          options={jamiatOptions}
          onChange={jamiatId =>
            setForm(current => ({ ...current, jamiatId }))
          }
          placeholder={
            jamiatOptions.length ? "Select Jamiyat" : "Create a Jamiyat first"
          }
        />

        {editing ? (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Active status</Text>
              <Text style={styles.switchHint}>
                UpdateJamaatRequest includes isActive.
              </Text>
            </View>
            <Switch
              value={form.isActive}
              onValueChange={isActive =>
                setForm(current => ({ ...current, isActive }))
              }
            />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.formActions}>
          {editing ? (
            <Button
              title="Cancel"
              variant="outline"
              onPress={resetForm}
              style={styles.actionButton}
            />
          ) : null}
          <Button
            title={editing ? "Update Jamaat" : "Create Jamaat"}
            loading={saving}
            disabled={!jamiatOptions.length}
            onPress={submit}
            style={styles.actionButton}
          />
        </View>
      </Card>

      <Card style={styles.listCard}>
        <View style={styles.listHeader}>
          <SectionHeading
            eyebrow="DIRECTORY"
            title="Jamaat list"
            description={`${items.length} Jamaat record${items.length === 1 ? "" : "s"}.`}
          />
          <Button
            title="Refresh"
            compact
            variant="outline"
            loading={loading}
            onPress={onReload}
          />
        </View>

        {!loading && items.length === 0 ? (
          <EmptyState
            title="No Jamaat records"
            description="Create a Jamiyat first, then add its Jamaat records."
          />
        ) : (
          items.map(item => (
            <View key={item.jamaatId} style={styles.recordRow}>
              <View style={styles.recordMain}>
                <Text style={styles.recordTitle}>{item.name || "Unnamed Jamaat"}</Text>
                <Text style={styles.recordMeta}>
                  ID {item.jamaatId} · {item.jamiatName || `Jamiyat ${item.jamiatId}`}
                </Text>
              </View>
              <StatusBadge active={item.isActive} />
              <View style={styles.recordActions}>
                <Button
                  title="Edit"
                  compact
                  variant="outline"
                  onPress={() => startEdit(item)}
                />
                <Button
                  title="Delete"
                  compact
                  variant="danger"
                  loading={deletingId === item.jamaatId}
                  onPress={() => remove(item)}
                />
              </View>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function AamilPanel({ jamaats, roles }) {
  const [form, setForm] = useState(EMPTY_AAMIL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdAamil, setCreatedAamil] = useState(null);

  const jamaatOptions = useMemo(
    () =>
      jamaats.map(item => ({
        label: `${item.name || "Unnamed Jamaat"} · ID ${item.jamaatId}`,
        value: String(item.jamaatId)
      })),
    [jamaats]
  );

  const roleOptions = useMemo(
    () =>
      (roles || []).map(item => ({
        label: item.roleName || `Role ${item.roleId}`,
        value: String(item.roleId)
      })),
    [roles]
  );

  useEffect(() => {
    if (form.roleId || !roles?.length) return;
    const aamilRole = roles.find(item =>
      String(item.roleName || "").trim().toUpperCase().replace(/[\s-]+/g, "_") === "AAMIL"
    );
    if (aamilRole) {
      setForm(current => ({ ...current, roleId: String(aamilRole.roleId) }));
    }
  }, [form.roleId, roles]);

  async function submit() {
    const roleId = Number(form.roleId);
    const jamaatId = Number(form.jamaatId);

    if (!form.itsNo.trim() || !form.name.trim() || !form.password) {
      setError("ITS number, name and password are required.");
      return;
    }
    if (!Number.isInteger(roleId) || roleId <= 0) {
      setError("Select the Aamil role.");
      return;
    }
    if (!Number.isInteger(jamaatId) || jamaatId <= 0) {
      setError("Select the Jamaat for this Aamil.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const created = await authApi.createAamil({
        itsNo: form.itsNo.trim(),
        name: form.name.trim(),
        password: form.password,
        roleId,
        jamaatId
      });
      setCreatedAamil(created);
      setForm(EMPTY_AAMIL_FORM);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.panelGrid}>
      <Card style={styles.formCard}>
        <SectionHeading
          eyebrow="SUPER ADMIN ONLY"
          title="Create Aamil"
          description="Create an Aamil and assign the correct role and Jamaat."
        />

        <Input
          label="ITS number"
          value={form.itsNo}
          onChangeText={itsNo => setForm(current => ({ ...current, itsNo }))}
          keyboardType="number-pad"
          autoCapitalize="none"
          placeholder="Enter ITS number"
        />
        <Input
          label="Name"
          value={form.name}
          onChangeText={name => setForm(current => ({ ...current, name }))}
          placeholder="Enter Aamil name"
          autoCapitalize="words"
        />
        <Input
          label="Temporary password"
          value={form.password}
          onChangeText={password =>
            setForm(current => ({ ...current, password }))
          }
          secureTextEntry
          placeholder="Enter password"
        />
        <Select
          label="Role"
          value={form.roleId}
          options={roleOptions}
          onChange={roleId => setForm(current => ({ ...current, roleId }))}
          placeholder="Select Aamil role"
        />
        <Select
          label="Jamaat"
          value={form.jamaatId}
          options={jamaatOptions}
          onChange={jamaatId =>
            setForm(current => ({ ...current, jamaatId }))
          }
          placeholder={
            jamaatOptions.length ? "Select Jamaat" : "Create a Jamaat first"
          }
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Create Aamil"
          loading={saving}
          disabled={!jamaatOptions.length}
          onPress={submit}
        />
      </Card>

      <View style={styles.sideColumn}>
        <Card style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Aamil management</Text>
          <Text style={styles.noticeText}>
            Aamil creation is available here. Listing, editing and removing Aamil records will appear when those management actions are available.
          </Text>
        </Card>

        {createdAamil ? (
          <Card style={styles.successCard}>
            <Text style={styles.successTitle}>Aamil created successfully</Text>
            <Text style={styles.successName}>{createdAamil.name}</Text>
            <Text style={styles.successMeta}>
              ITS {createdAamil.itsNo} · User ID {createdAamil.userId}
            </Text>
            <Text style={styles.successMeta}>
              Role {createdAamil.roleName || createdAamil.roleId} · Jamaat ID {createdAamil.jamaatId}
            </Text>
            <Text style={styles.successHint}>
              The new Aamil is ready to use with the assigned Jamaat access.
            </Text>
          </Card>
        ) : null}
      </View>
    </View>
  );
}

export default function SuperAdminScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const { user, bootstrapping, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("jamiat");
  const [jamiats, setJamiats] = useState([]);
  const [jamaats, setJamaats] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDirectories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [jamiatItems, jamaatItems, roleItems] = await Promise.all([
        jamiatApi.getAll(),
        jamaatApi.getAll(),
        authApi.getRoles()
      ]);
      setJamiats(Array.isArray(jamiatItems) ? jamiatItems : []);
      setJamaats(Array.isArray(jamaatItems) ? jamaatItems : []);
      setRoles(Array.isArray(roleItems) ? roleItems : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isSuperAdmin(user)) loadDirectories();
  }, [loadDirectories, user]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (bootstrapping) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;
  if (!isSuperAdmin(user)) return <Redirect href="/(app)" />;

  return (
    <Screen contentStyle={[styles.page, phone && styles.pagePhone, width >= 1080 && styles.pageWide]}>
      <PageHeader user={user} onLogout={handleLogout} phone={phone} narrow={narrow} />

      <View style={[styles.heroRow, phone && styles.heroRowPhone, phone && shadows.card]}>
        <View style={[styles.heroCopy, phone && styles.heroCopyPhone]}>
          <Text style={styles.heroEyebrow}>MULTI-TENANT SETUP</Text>
          <Text style={[styles.heroTitle, phone && styles.heroTitlePhone]}>Manage the JamaatOne network</Text>
          <Text style={[styles.heroDescription, phone && styles.heroDescriptionPhone]}>
            {phone
              ? "Manage Jamiyat, Jamaat, Aamil and payment configuration from one place."
              : "Create Jamiyat and Jamaat records, assign an Aamil to the correct Jamaat, configure payment setup, and review request activity. Each Jamaat remains separated by its assigned access scope."}
          </Text>
        </View>
        <View style={[styles.statsRow, phone && styles.statsRowPhone]}>
          <View style={[styles.statCard, phone && styles.statCardPhone]}>
            <Text style={styles.statValue}>{jamiats.length}</Text>
            <Text style={styles.statLabel}>Jamiyat</Text>
          </View>
          <View style={[styles.statCard, phone && styles.statCardPhone]}>
            <Text style={styles.statValue}>{jamaats.length}</Text>
            <Text style={styles.statLabel}>Jamaat</Text>
          </View>
        </View>
      </View>

      <TabBar activeTab={activeTab} onChange={setActiveTab} phone={phone} />

      {error ? (
        <Card style={styles.pageErrorCard}>
          <Text style={styles.errorTitle}>Could not load Super Admin data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try again"
            compact
            variant="outline"
            onPress={loadDirectories}
            style={styles.retryButton}
          />
        </Card>
      ) : null}

      {loading && !jamiats.length && !jamaats.length ? (
        <LoadingView />
      ) : activeTab === "jamiat" ? (
        <JamiatPanel
          items={jamiats}
          loading={loading}
          onReload={loadDirectories}
        />
      ) : activeTab === "jamaat" ? (
        <JamaatPanel
          items={jamaats}
          jamiats={jamiats}
          loading={loading}
          onReload={loadDirectories}
        />
      ) : activeTab === "aamil" ? (
        <AamilPanel
          jamaats={jamaats.filter(item => item.isActive !== false)}
          roles={roles}
        />
      ) : PAYMENT_SETUP_TABS[activeTab] ? (
        <PaymentSetupPanel section={PAYMENT_SETUP_TABS[activeTab]} />
      ) : (
        <ApiLogsPanel />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    maxWidth: 1320,
    paddingTop: spacing.md
  },
  pagePhone: { paddingTop: spacing.sm },
  pageWide: {
    paddingHorizontal: spacing.xl
  },
  header: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl
  },
  headerPhone: { minHeight: 0, paddingHorizontal: spacing.md, paddingVertical: spacing.md, display: "flex", flexDirection: "column", alignItems: "stretch", gap: spacing.sm, marginBottom: spacing.md, borderRadius: 20 },
  mobileHeaderTop: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1
  },
  brandBlockPhone: { flex: 1, minWidth: 0 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  brandMarkNarrow: { width: 38, height: 38, borderRadius: 12 },
  brandInitial: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800"
  },
  brandText: {
    marginLeft: spacing.sm,
    flexShrink: 1
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800"
  },
  headerTitle: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 2
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.md
  },
  headerActionsPhone: { marginLeft: 0, flexShrink: 0 },
  userInfo: {
    alignItems: "flex-end",
    marginRight: spacing.md
  },
  userInfoPhone: { marginRight: spacing.sm },
  mobileSignOut: { flexShrink: 0, minWidth: 92 },
  mobileUserStrip: { width: "100%", minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surfaceTint, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 8, flexDirection: "row", alignItems: "center" },
  mobileUserAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  mobileUserAvatarText: { color: colors.accentStrong, fontSize: 13, fontWeight: "900" },
  mobileUserCopy: { flex: 1, minWidth: 0, marginLeft: spacing.sm },
  mobileUserName: { color: colors.text, fontSize: 13, fontWeight: "800" },
  mobileUserMeta: { color: colors.muted, fontSize: 10.5, marginTop: 1 },
  userName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  userMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  heroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  heroRowPhone: { width: "100%", flexDirection: "column", flexWrap: "nowrap", alignItems: "stretch", justifyContent: "flex-start", marginBottom: spacing.md, padding: spacing.md, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  heroCopy: {
    flex: 1,
    minWidth: 280,
    maxWidth: 760,
    marginRight: spacing.lg
  },
  heroCopyPhone: { flex: 0, flexGrow: 0, flexShrink: 0, flexBasis: "auto", minWidth: 0, width: "100%", maxWidth: "100%", marginRight: 0 },
  heroEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5
  },
  heroTitle: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  heroTitlePhone: { fontSize: 26, lineHeight: 31 },
  heroDescription: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.sm
  },
  heroDescriptionPhone: { fontSize: 13.5, lineHeight: 20, marginTop: 8, maxWidth: "100%" },
  statsRow: {
    flexDirection: "row",
    marginTop: spacing.md
  },
  statsRowPhone: { width: "100%", flex: 0, flexGrow: 0, flexShrink: 0, flexDirection: "row", gap: spacing.sm, flexWrap: "nowrap", alignItems: "stretch", justifyContent: "space-between", marginTop: spacing.md },
  statCard: {
    minWidth: 108,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    marginLeft: spacing.sm
  },
  statCardPhone: { width: "47.5%", maxWidth: "47.5%", flexGrow: 0, flexShrink: 0, flexBasis: "47.5%", minWidth: 0, minHeight: 78, maxHeight: 90, marginLeft: 0, paddingHorizontal: spacing.md, paddingVertical: 12, justifyContent: "center" },
  statValue: {
    color: colors.primaryStrong,
    fontSize: 24,
    fontWeight: "800"
  },
  statLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "flex-start",
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg
  },
  tabsScroll: { width: "100%", marginBottom: spacing.md },
  tabsScrollContent: { paddingRight: spacing.md },
  tabsPhone: { flexWrap: "nowrap", alignSelf: "stretch", marginBottom: 0, borderRadius: 16, padding: 4 },
  tab: {
    minWidth: 104,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  tabPhone: { minWidth: 104, minHeight: 40, paddingHorizontal: 14 },
  tabSelected: {
    backgroundColor: colors.surface,
    ...shadows.card
  },
  tabText: {
    color: colors.muted,
    fontWeight: "700"
  },
  tabTextSelected: {
    color: colors.primaryStrong
  },
  panelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.md
  },
  formCard: {
    flexGrow: 1,
    flexBasis: 340,
    minWidth: 0,
    flexShrink: 1
  },
  listCard: {
    flexGrow: 2,
    flexBasis: 610,
    minWidth: 0,
    flexShrink: 1
  },
  sideColumn: {
    flexGrow: 2,
    flexBasis: 520,
    minWidth: 0,
    flexShrink: 1
  },
  sectionHeading: {
    flex: 1,
    marginBottom: spacing.lg
  },
  sectionEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.family,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 3
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  switchRow: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  switchText: {
    flex: 1,
    paddingRight: spacing.md
  },
  switchLabel: {
    color: colors.text,
    fontWeight: "800"
  },
  switchHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3
  },
  formActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 140,
    marginHorizontal: spacing.xs,
    marginTop: spacing.xs
  },
  listHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  recordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  recordMain: {
    flex: 1,
    minWidth: 190,
    paddingRight: spacing.md
  },
  recordTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  recordMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginRight: spacing.md
  },
  activeBadge: {
    backgroundColor: colors.successSoft
  },
  inactiveBadge: {
    backgroundColor: colors.dangerSoft
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800"
  },
  activeText: {
    color: colors.success
  },
  inactiveText: {
    color: colors.danger
  },
  recordActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md
  },
  emptyState: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center"
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  emptyDescription: {
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs
  },
  noticeCard: {
    backgroundColor: colors.infoSoft
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  noticeText: {
    color: colors.textSoft,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  endpointBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm
  },
  endpointAvailable: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1
  },
  endpointMissing: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1
  },
  endpointText: {
    color: colors.text,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
    fontSize: 13,
    marginTop: 4
  },
  noticeFootnote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: spacing.md
  },
  successCard: {
    backgroundColor: colors.successSoft
  },
  successTitle: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800"
  },
  successName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.sm
  },
  successMeta: {
    color: colors.textSoft,
    marginTop: spacing.xs
  },
  successHint: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: spacing.md
  },
  pageErrorCard: {
    backgroundColor: colors.dangerSoft
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: spacing.xs
  },
  retryButton: {
    alignSelf: "flex-start"
  }
});
