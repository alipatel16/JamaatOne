import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";

import { accountsApi } from "../api/accountsApi";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import Select from "./Select";

const FIELD_TYPES = [
  { label: "Text", value: "TEXT" },
  { label: "Long text", value: "TEXTAREA" },
  { label: "Number", value: "NUMBER" },
  { label: "Date", value: "DATE" },
  { label: "Month picker", value: "MONTH" },
  { label: "Member / family dropdown", value: "MEMBER" },
  { label: "Dropdown (text value)", value: "DROPDOWN" }
];

async function confirmDelete(title, message) {
  if (Platform.OS === "web") return globalThis.confirm?.(`${title}\n\n${message}`) ?? false;
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) }
    ]);
  });
}

function Section({ sectionKey, activeSection, title, description, children }) {
  if (activeSection !== "all" && activeSection !== sectionKey) return null;

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      {children}
    </Card>
  );
}

function Status({ active }) {
  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
      <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextInactive]}>
        {active ? "Active" : "Inactive"}
      </Text>
    </View>
  );
}

export default function PaymentSetupPanel({ section = "all" }) {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categoryForm, setCategoryForm] = useState({ id: null, name: "", isActive: true });
  const [subForm, setSubForm] = useState({ id: null, categoryId: "", name: "", isActive: true });
  const [fieldForm, setFieldForm] = useState({
    id: null,
    subCategoryId: "",
    fieldName: "",
    fieldKey: "",
    fieldType: "TEXT",
    isRequired: false,
    displayOrder: "1",
    isActive: true
  });
  const [methodForm, setMethodForm] = useState({ id: null, name: "", isActive: true });
  const [savingKey, setSavingKey] = useState("");

  const categoryOptions = useMemo(
    () => categories.map(item => ({
      label: `${item.categoryName || "Unnamed"}${item.isActive === false ? " (inactive)" : ""}`,
      value: String(item.categoryId)
    })),
    [categories]
  );

  const subCategoryOptions = useMemo(
    () => subCategories.map(item => ({
      label: `${item.categoryName || "Category"} · ${item.subCategoryName || "Unnamed"}${item.isActive === false ? " (inactive)" : ""}`,
      value: String(item.subCategoryId)
    })),
    [subCategories]
  );

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const [categoryData, subCategoryData, fieldData, methodData] = await Promise.all([
        accountsApi.getPaymentCategories(),
        accountsApi.getPaymentSubCategories(),
        accountsApi.getPaymentFields(),
        accountsApi.getPaymentMethods()
      ]);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setSubCategories(Array.isArray(subCategoryData) ? subCategoryData : []);
      setFields(Array.isArray(fieldData) ? fieldData : []);
      setMethods(Array.isArray(methodData) ? methodData : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment setup.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCategory() {
    if (!categoryForm.name.trim()) return setError("Category name is required.");
    try {
      setSavingKey("category"); setError("");
      if (categoryForm.id) {
        await accountsApi.updatePaymentCategory(categoryForm.id, {
          name: categoryForm.name.trim(),
          isActive: categoryForm.isActive
        });
      } else await accountsApi.createPaymentCategory(categoryForm.name.trim());
      setCategoryForm({ id: null, name: "", isActive: true });
      await loadAll();
    } catch (e) { setError(e.message); } finally { setSavingKey(""); }
  }

  async function saveSubCategory() {
    if (!subForm.categoryId) return setError("Select a payment category.");
    if (!subForm.name.trim()) return setError("Subcategory name is required.");
    try {
      setSavingKey("subcategory"); setError("");
      if (subForm.id) {
        await accountsApi.updatePaymentSubCategory(subForm.id, {
          categoryId: Number(subForm.categoryId),
          name: subForm.name.trim(),
          isActive: subForm.isActive
        });
      } else {
        await accountsApi.createPaymentSubCategory(Number(subForm.categoryId), subForm.name.trim());
      }
      setSubForm({ id: null, categoryId: "", name: "", isActive: true });
      await loadAll();
    } catch (e) { setError(e.message); } finally { setSavingKey(""); }
  }

  async function saveField() {
    if (!fieldForm.subCategoryId) return setError("Select a payment subcategory.");
    if (!fieldForm.fieldName.trim()) return setError("Field name is required.");
    if (!fieldForm.fieldKey.trim()) return setError("Field key is required.");
    try {
      setSavingKey("field"); setError("");
      const payload = {
        subCategoryId: Number(fieldForm.subCategoryId),
        fieldName: fieldForm.fieldName.trim(),
        fieldKey: fieldForm.fieldKey.trim(),
        fieldType: fieldForm.fieldType,
        isRequired: fieldForm.isRequired,
        displayOrder: Number(fieldForm.displayOrder || 0),
        isActive: fieldForm.isActive
      };
      if (fieldForm.id) await accountsApi.updatePaymentField(fieldForm.id, payload);
      else await accountsApi.createPaymentField(payload);
      setFieldForm({ id: null, subCategoryId: "", fieldName: "", fieldKey: "", fieldType: "TEXT", isRequired: false, displayOrder: "1", isActive: true });
      await loadAll();
    } catch (e) { setError(e.message); } finally { setSavingKey(""); }
  }

  async function saveMethod() {
    if (!methodForm.name.trim()) return setError("Payment method name is required.");
    try {
      setSavingKey("method"); setError("");
      if (methodForm.id) {
        await accountsApi.updatePaymentMethod(methodForm.id, {
          name: methodForm.name.trim(),
          isActive: methodForm.isActive
        });
      } else await accountsApi.createPaymentMethod(methodForm.name.trim());
      setMethodForm({ id: null, name: "", isActive: true });
      await loadAll();
    } catch (e) { setError(e.message); } finally { setSavingKey(""); }
  }

  async function remove(kind, id, label) {
    const ok = await confirmDelete(`Delete ${kind}?`, `Delete “${label}”?`);
    if (!ok) return;
    try {
      setError("");
      if (kind === "category") await accountsApi.deletePaymentCategory(id);
      if (kind === "subcategory") await accountsApi.deletePaymentSubCategory(id);
      if (kind === "field") await accountsApi.deletePaymentField(id);
      if (kind === "payment method") await accountsApi.deletePaymentMethod(id);
      await loadAll();
    } catch (e) { setError(e.message); }
  }

  if (loading && !categories.length && !methods.length) {
    return <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Payment configuration</Text>
        <Text style={styles.introText}>
          Configure the categories, subcategories, custom fields and payment methods used while recording payments.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Section sectionKey="categories" activeSection={section} title="Payment categories" description="Top-level heads such as Madrasa, FMB, Sabil, Lagat or Others.">
        <Input label="Category name" value={categoryForm.name} onChangeText={name => setCategoryForm(v => ({ ...v, name }))} />
        {categoryForm.id ? (
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Active</Text><Switch value={categoryForm.isActive} onValueChange={isActive => setCategoryForm(v => ({ ...v, isActive }))} /></View>
        ) : null}
        <View style={styles.formActions}>
          <Button title={categoryForm.id ? "Update category" : "Add category"} compact loading={savingKey === "category"} onPress={saveCategory} />
          {categoryForm.id ? <Button title="Cancel" compact variant="outline" onPress={() => setCategoryForm({ id: null, name: "", isActive: true })} /> : null}
        </View>
        <View style={styles.list}>{categories.map(item => (
          <View key={item.categoryId} style={styles.row}>
            <View style={styles.flex}><Text style={styles.name}>{item.categoryName}</Text><Text style={styles.meta}>ID {item.categoryId}</Text></View>
            <Status active={item.isActive !== false} />
            <Button title="Edit" compact variant="outline" onPress={() => setCategoryForm({ id: item.categoryId, name: item.categoryName || "", isActive: item.isActive !== false })} />
            <Button title="Delete" compact variant="danger" onPress={() => remove("category", item.categoryId, item.categoryName)} />
          </View>
        ))}</View>
      </Section>

      <Section sectionKey="subcategories" activeSection={section} title="Payment subcategories" description="Each subcategory belongs to a payment category, for example Monthly Fee or Annual Fee under Madrasa.">
        <Select label="Category" value={subForm.categoryId} options={categoryOptions} onChange={categoryId => setSubForm(v => ({ ...v, categoryId }))} />
        <Input label="Subcategory name" value={subForm.name} onChangeText={name => setSubForm(v => ({ ...v, name }))} />
        {subForm.id ? <View style={styles.switchRow}><Text style={styles.switchLabel}>Active</Text><Switch value={subForm.isActive} onValueChange={isActive => setSubForm(v => ({ ...v, isActive }))} /></View> : null}
        <View style={styles.formActions}>
          <Button title={subForm.id ? "Update subcategory" : "Add subcategory"} compact loading={savingKey === "subcategory"} onPress={saveSubCategory} />
          {subForm.id ? <Button title="Cancel" compact variant="outline" onPress={() => setSubForm({ id: null, categoryId: "", name: "", isActive: true })} /> : null}
        </View>
        <View style={styles.list}>{subCategories.map(item => (
          <View key={item.subCategoryId} style={styles.row}>
            <View style={styles.flex}><Text style={styles.name}>{item.subCategoryName}</Text><Text style={styles.meta}>{item.categoryName} · ID {item.subCategoryId}</Text></View>
            <Status active={item.isActive !== false} />
            <Button title="Edit" compact variant="outline" onPress={() => setSubForm({ id: item.subCategoryId, categoryId: String(item.categoryId), name: item.subCategoryName || "", isActive: item.isActive !== false })} />
            <Button title="Delete" compact variant="danger" onPress={() => remove("subcategory", item.subCategoryId, item.subCategoryName)} />
          </View>
        ))}</View>
      </Section>

      <Section sectionKey="fields" activeSection={section} title="Dynamic payment fields" description="Fields are loaded by subcategory. Use MEMBER for the Madrasa ‘paid for whom’ family dropdown, and MONTH for from/to month fields.">
        <Select label="Subcategory" value={fieldForm.subCategoryId} options={subCategoryOptions} onChange={subCategoryId => setFieldForm(v => ({ ...v, subCategoryId }))} />
        <Input label="Field label" value={fieldForm.fieldName} onChangeText={fieldName => setFieldForm(v => ({ ...v, fieldName }))} placeholder="Paid for whom" />
        <Input label="Field key" value={fieldForm.fieldKey} onChangeText={fieldKey => setFieldForm(v => ({ ...v, fieldKey }))} placeholder="paidForMember" />
        <Select label="Field type" value={fieldForm.fieldType} options={FIELD_TYPES} onChange={fieldType => setFieldForm(v => ({ ...v, fieldType }))} />
        <Input label="Display order" value={fieldForm.displayOrder} keyboardType="number-pad" onChangeText={displayOrder => setFieldForm(v => ({ ...v, displayOrder }))} />
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Required</Text><Switch value={fieldForm.isRequired} onValueChange={isRequired => setFieldForm(v => ({ ...v, isRequired }))} /></View>
        {fieldForm.id ? <View style={styles.switchRow}><Text style={styles.switchLabel}>Active</Text><Switch value={fieldForm.isActive} onValueChange={isActive => setFieldForm(v => ({ ...v, isActive }))} /></View> : null}
        <View style={styles.formActions}>
          <Button title={fieldForm.id ? "Update field" : "Add field"} compact loading={savingKey === "field"} onPress={saveField} />
          {fieldForm.id ? <Button title="Cancel" compact variant="outline" onPress={() => setFieldForm({ id: null, subCategoryId: "", fieldName: "", fieldKey: "", fieldType: "TEXT", isRequired: false, displayOrder: "1", isActive: true })} /> : null}
        </View>
        <View style={styles.list}>{[...fields].sort((a,b) => Number(a.displayOrder||0)-Number(b.displayOrder||0)).map(item => (
          <View key={item.fieldId} style={styles.row}>
            <View style={styles.flex}><Text style={styles.name}>{item.fieldName}</Text><Text style={styles.meta}>{item.categoryName} · {item.subCategoryName} · {item.fieldType} · order {item.displayOrder}</Text></View>
            <Status active={item.isActive !== false} />
            <Button title="Edit" compact variant="outline" onPress={() => setFieldForm({ id: item.fieldId, subCategoryId: String(item.subCategoryId), fieldName: item.fieldName || "", fieldKey: item.fieldKey || "", fieldType: item.fieldType || "TEXT", isRequired: Boolean(item.isRequired), displayOrder: String(item.displayOrder ?? 0), isActive: item.isActive !== false })} />
            <Button title="Delete" compact variant="danger" onPress={() => remove("field", item.fieldId, item.fieldName)} />
          </View>
        ))}</View>
      </Section>

      <Section sectionKey="methods" activeSection={section} title="Payment methods" description="These options appear directly in the Add Payment dialog, for example Cash, UPI, Cheque or Bank Transfer.">
        <Input label="Payment method" value={methodForm.name} onChangeText={name => setMethodForm(v => ({ ...v, name }))} />
        {methodForm.id ? <View style={styles.switchRow}><Text style={styles.switchLabel}>Active</Text><Switch value={methodForm.isActive} onValueChange={isActive => setMethodForm(v => ({ ...v, isActive }))} /></View> : null}
        <View style={styles.formActions}>
          <Button title={methodForm.id ? "Update method" : "Add method"} compact loading={savingKey === "method"} onPress={saveMethod} />
          {methodForm.id ? <Button title="Cancel" compact variant="outline" onPress={() => setMethodForm({ id: null, name: "", isActive: true })} /> : null}
        </View>
        <View style={styles.list}>{methods.map(item => (
          <View key={item.paymentMethodId} style={styles.row}>
            <View style={styles.flex}><Text style={styles.name}>{item.paymentMethodName}</Text><Text style={styles.meta}>ID {item.paymentMethodId}</Text></View>
            <Status active={item.isActive !== false} />
            <Button title="Edit" compact variant="outline" onPress={() => setMethodForm({ id: item.paymentMethodId, name: item.paymentMethodName || "", isActive: item.isActive !== false })} />
            <Button title="Delete" compact variant="danger" onPress={() => remove("payment method", item.paymentMethodId, item.paymentMethodName)} />
          </View>
        ))}</View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  intro: { marginBottom: spacing.xs },
  introTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  introText: { color: colors.muted, marginTop: spacing.xs, lineHeight: 20 },
  error: { color: colors.danger, fontWeight: "700" },
  section: { padding: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  sectionDescription: { color: colors.muted, marginTop: 4, marginBottom: spacing.lg, lineHeight: 19 },
  formActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, minHeight: 42 },
  switchLabel: { color: colors.text, fontWeight: "700" },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  flex: { flex: 1, minWidth: 180, flexShrink: 1 },
  name: { color: colors.text, fontWeight: "800" },
  meta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeActive: { backgroundColor: "#E6F4EF" },
  badgeInactive: { backgroundColor: "#F4EAEA" },
  badgeText: { fontSize: 11, fontWeight: "800" },
  badgeTextActive: { color: colors.primaryStrong },
  badgeTextInactive: { color: colors.danger }
});
