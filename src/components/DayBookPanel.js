import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { accountsApi } from "../api/accountsApi";
import { ENTRY_TYPES } from "../constants/accounts";
import { colors, radius, spacing } from "../theme";
import ActivityTimeline from "./ActivityTimeline";
import Button from "./Button";
import Card from "./Card";
import DatePickerField, { localDateValue, transactionDateToIso } from "./DatePickerField";
import Input from "./Input";
import Select from "./Select";

const PAGE_SIZE = 20;

function createEmptyForm() {
  return {
    entryType: "",
    categoryId: "",
    subCategoryId: "",
    fieldValues: {},
    amount: "",
    paymentMethodId: "",
    bankAccountId: "",
    paymentReferenceNo: "",
    remarks: "",
    transactionDate: localDateValue()
  };
}

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

function isDebitEntry(value) {
  return String(value || "").trim().toUpperCase() === "DEBIT";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function apiFilterDate(value, endOfDay = false) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`;
}

async function confirmAction(title, message, actionLabel) {
  if (Platform.OS === "web") {
    return globalThis.confirm?.(`${title}\n\n${message}`) ?? false;
  }

  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      {
        text: actionLabel,
        style: "destructive",
        onPress: () => resolve(true)
      }
    ]);
  });
}

export default function DayBookPanel({ manager, canDelete = false, canRefund = false, filters = {} }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const [methods, setMethods] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [entries, setEntries] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [entryTypeFilter, setEntryTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logs, setLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const categoryOptions = useMemo(
    () => categories.filter(item => item?.isActive !== false).map(item => ({
      label: item.categoryName || `Category ${item.categoryId}`,
      value: String(item.categoryId)
    })),
    [categories]
  );

  const subCategoryOptions = useMemo(
    () => subCategories.filter(item => item?.isActive !== false).filter(item => {
      if (!form.entryType) return true;
      return !item.entryType || String(item.entryType).toUpperCase() === String(form.entryType).toUpperCase();
    }).map(item => ({
      label: item.subCategoryName || `Subcategory ${item.subCategoryId}`,
      value: String(item.subCategoryId)
    })),
    [subCategories, form.entryType]
  );

  const methodOptions = useMemo(
    () =>
      methods
        .filter(item => item.isActive !== false)
        .map(item => ({
          label: item.paymentMethodName || `Method ${item.paymentMethodId}`,
          value: String(item.paymentMethodId)
        })),
    [methods]
  );

  const bankOptions = useMemo(
    () =>
      bankAccounts
        .filter(item => item?.isActive !== false)
        .map(item => ({
          label: `${item.bankAccountName || item.bankName || "Bank account"}${
            item.bankAccountNumber ? ` · ${String(item.bankAccountNumber).slice(-4)}` : ""
          }`,
          value: String(item.bankAccountId)
        })),
    [bankAccounts]
  );

  const filterCategoryOptions = useMemo(
    () => [{ label: "All categories", value: "" }, ...categoryOptions],
    [categoryOptions]
  );

  const filterSubCategoryOptions = useMemo(
    () => [{ label: "All subcategories", value: "" }, ...subCategories.filter(item => item?.isActive !== false).map(item => ({ label: item.subCategoryName || `Subcategory ${item.subCategoryId}`, value: String(item.subCategoryId) }))],
    [subCategories]
  );

  const filterMethodOptions = useMemo(
    () => [{ label: "All payment methods", value: "" }, ...methodOptions],
    [methodOptions]
  );

  const typeFilterOptions = useMemo(
    () => [{ label: "All entry types", value: "" }, ...ENTRY_TYPES],
    []
  );

  const visibleEntries = useMemo(() => {
    const query = String(filters.search || "").trim().toLowerCase();
    if (!query) return entries;

    // The current Day Book GET API has no `search` query parameter, so text
    // search can only be applied to the currently loaded server page.
    return entries.filter(item =>
      [
        item.paymentMethodName,
        item.paymentReferenceNo,
        item.remarks,
        item.entryType,
        item.createdByName,
        item.createdByItsNo
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [entries, filters.search]);

  useEffect(() => {
    loadMethods();
  }, []);

  useEffect(() => {
    setPageNumber(1);
    loadEntries(1);
  }, [
    filters.fromDate,
    filters.toDate,
    entryTypeFilter,
    categoryFilter,
    subCategoryFilter,
    paymentMethodFilter
  ]);

  useEffect(() => {
    if (pageNumber !== 1) loadEntries(pageNumber);
  }, [pageNumber]);

  async function loadMethods(forForm = false) {
    try {
      const [methodResult, bankResult, categoryResult] = await Promise.all([
        accountsApi.getPaymentMethods(),
        accountsApi.getBankAccounts(),
        accountsApi.getPaymentCategories()
      ]);
      setMethods(Array.isArray(methodResult) ? methodResult : []);
      setCategories((Array.isArray(categoryResult) ? categoryResult : []).filter(item => item?.isActive !== false));
      setBankAccounts(
        (Array.isArray(bankResult) ? bankResult : []).filter(
          item => item?.isActive !== false
        )
      );
    } catch (requestError) {
      const message = requestError.message || "Unable to load payment methods and bank accounts.";
      if (forForm) setFormError(message);
      else setError(message);
    }
  }

  async function loadEntries(page = 1) {
    try {
      setLoading(true);
      setError("");
      const result = await accountsApi.getDaybook({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        entryType: entryTypeFilter || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        subCategoryId: subCategoryFilter ? Number(subCategoryFilter) : undefined,
        paymentMethodId: paymentMethodFilter
          ? Number(paymentMethodFilter)
          : undefined,
        fromDate: apiFilterDate(filters.fromDate),
        toDate: apiFilterDate(filters.toDate, true)
      });

      setEntries(
        (Array.isArray(result?.items) ? result.items : []).filter(
          item => item?.isActive !== false
        )
      );
      setTotalCount(Number(result?.totalCount || 0));
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (requestError) {
      setEntries([]);
      setError(requestError.message || "Unable to load Day Book entries.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentPage() {
    const nextPage = Math.min(pageNumber, totalPages || 1);
    if (nextPage !== pageNumber) setPageNumber(nextPage);
    else await loadEntries(nextPage);
  }

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm());
    setSubCategories([]);
    setFields([]);
    setError("");
    setFormError("");
  }

  async function openCreate() {
    resetForm();
    setShowForm(true);
    await loadMethods(true);
  }


  async function loadSubCategories(categoryId, entryType = form.entryType) {
    if (!categoryId) {
      setSubCategories([]);
      return [];
    }
    try {
      const result = await accountsApi.getPaymentSubCategoriesByCategory(
        Number(categoryId),
        entryType || undefined
      );
      const active = (Array.isArray(result) ? result : []).filter(
        item => item?.isActive !== false
      );
      setSubCategories(active);
      return active;
    } catch (requestError) {
      setFormError(requestError.message || "Unable to load Day Book subcategories.");
      return [];
    }
  }

  async function changeCategory(categoryId) {
    setForm(current => ({ ...current, categoryId, subCategoryId: "", fieldValues: {} }));
    setFields([]);
    setFormError("");
    await loadSubCategories(categoryId, form.entryType);
  }

  async function changeEntryType(entryType) {
    const categoryId = form.categoryId;
    setForm(current => ({ ...current, entryType, subCategoryId: "", fieldValues: {} }));
    setFields([]);
    setFormError("");
    if (categoryId) await loadSubCategories(categoryId, entryType);
  }

  async function changeEntryTypeFilterValue(entryType) {
    setEntryTypeFilter(entryType);
    setSubCategoryFilter("");
    if (!categoryFilter) return;
    try {
      const result = await accountsApi.getPaymentSubCategoriesByCategory(
        Number(categoryFilter),
        entryType || undefined
      );
      setSubCategories(
        (Array.isArray(result) ? result : []).filter(item => item?.isActive !== false)
      );
    } catch {
      setSubCategories([]);
    }
  }

  async function changeSubCategory(subCategoryId) {
    setForm(current => ({ ...current, subCategoryId, fieldValues: {} }));
    if (!subCategoryId) { setFields([]); return; }
    try {
      const result = await accountsApi.getPaymentFieldsBySubCategory(Number(subCategoryId));
      setFields((Array.isArray(result) ? result : []).filter(item => item?.isActive !== false).sort((a,b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)));
    } catch (requestError) {
      setFormError(requestError.message || "Unable to load Day Book fields.");
    }
  }

  function changeFieldValue(fieldId, value) {
    setForm(current => ({ ...current, fieldValues: { ...current.fieldValues, [String(fieldId)]: value } }));
  }

  function validateForm() {
    if (!form.entryType) return "Select an entry type.";
    if (!form.categoryId) return "Select a category.";
    const compatibleSubCategories = subCategories.filter(item => !item.entryType || String(item.entryType).toUpperCase() === String(form.entryType).toUpperCase());
    if (compatibleSubCategories.length > 0 && !form.subCategoryId) return "Select a subcategory.";
    const missingField = fields.find(field => field.isRequired && !String(form.fieldValues[String(field.fieldId)] || "").trim());
    if (missingField) return `${missingField.fieldName || "Required field"} is required.`;
    if (!form.amount || Number(form.amount) <= 0) return "Enter a valid amount.";
    if (!form.paymentMethodId) return "Select a payment method.";
    if (!form.bankAccountId) return "Select a bank account.";
    if (!form.transactionDate) return "Select a transaction date.";
    return "";
  }

  function buildPayload() {
    const fieldValues = fields.map(field => ({
      fieldId: Number(field.fieldId),
      value: String(form.fieldValues[String(field.fieldId)] || "").trim()
    })).filter(item => item.value !== "");
    return {
      entryType: form.entryType,
      categoryId: Number(form.categoryId),
      subCategoryId: form.subCategoryId ? Number(form.subCategoryId) : null,
      amount: Number(form.amount),
      paymentMethodId: Number(form.paymentMethodId),
      bankAccountId: Number(form.bankAccountId),
      paymentReferenceNo: form.paymentReferenceNo.trim() || null,
      remarks: form.remarks.trim() || null,
      transactionDate: transactionDateToIso(form.transactionDate),
      fieldValues
    };
  }

  async function saveEntry() {
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const payload = buildPayload();
      if (editingId) {
        await accountsApi.updateDaybookEntry(editingId, payload);
      } else {
        await accountsApi.createDaybookEntry(payload);
      }
      setShowForm(false);
      resetForm();
      if (pageNumber === 1) await loadEntries(1);
      else setPageNumber(1);
    } catch (requestError) {
      setFormError(requestError.message || "Unable to save Day Book entry.");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(dayBookId) {
    try {
      setDetailLoading(true);
      setError("");
      setDetail(await accountsApi.getDaybookEntry(dayBookId));
    } catch (requestError) {
      setError(requestError.message || "Unable to load Day Book details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function editEntry(dayBookId) {
    try {
      setDetailLoading(true);
      setError("");
      await loadMethods();
      const item = await accountsApi.getDaybookEntry(dayBookId);
      const loadedSubCategories = item.categoryId ? await accountsApi.getPaymentSubCategoriesByCategory(Number(item.categoryId), item.entryType || undefined) : [];
      setSubCategories((Array.isArray(loadedSubCategories) ? loadedSubCategories : []).filter(entry => entry?.isActive !== false));
      const loadedFields = item.subCategoryId ? await accountsApi.getPaymentFieldsBySubCategory(Number(item.subCategoryId)) : [];
      setFields((Array.isArray(loadedFields) ? loadedFields : []).filter(field => field?.isActive !== false));
      const savedValues = {};
      (item.fieldValues || []).forEach(field => { savedValues[String(field.fieldId)] = field.value || ""; });
      setEditingId(item.dayBookId);
      setForm({
        entryType: String(item.entryType || "").toUpperCase(),
        categoryId: item.categoryId ? String(item.categoryId) : "",
        subCategoryId: item.subCategoryId ? String(item.subCategoryId) : "",
        fieldValues: savedValues,
        amount: String(item.amount ?? ""),
        paymentMethodId: String(item.paymentMethodId ?? ""),
        bankAccountId: item.bankAccountId ? String(item.bankAccountId) : "",
        paymentReferenceNo: item.paymentReferenceNo || "",
        remarks: item.remarks || "",
        transactionDate: localDateValue(item.transactionDate || item.createdAt)
      });
      setShowForm(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to edit Day Book entry.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function refundEntry(item) {
    if (!canRefund || item?.isRefunded) return;
    const proceed = await confirmAction(
      "Refund Day Book entry?",
      `Refund Day Book entry #${item.dayBookId}? The entry stays in history and is marked refunded.`,
      "Refund"
    );
    if (!proceed) return;

    try {
      setError("");
      await accountsApi.refundDaybookEntry(item.dayBookId);
      await refreshCurrentPage();
      if (detail?.dayBookId === item.dayBookId) {
        setDetail(await accountsApi.getDaybookEntry(item.dayBookId));
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to refund Day Book entry.");
    }
  }

  async function deleteEntry(item) {
    if (!canDelete) return;
    const proceed = await confirmAction(
      "Delete Day Book entry?",
      `Delete Day Book entry #${item.dayBookId}? This action cannot be undone.`,
      "Delete"
    );
    if (!proceed) return;

    try {
      setError("");
      await accountsApi.deleteDaybookEntry(item.dayBookId);
      setEntries(current =>
        current.filter(entry => entry.dayBookId !== item.dayBookId)
      );
      if (detail?.dayBookId === item.dayBookId) setDetail(null);
      await refreshCurrentPage();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete Day Book entry.");
    }
  }

  async function openLogs(dayBookId) {
    try {
      setLogsLoading(true);
      setError("");
      const result = await accountsApi.getDaybookLogs(dayBookId);
      setLogs({
        dayBookId,
        items: Array.isArray(result) ? result : []
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load Day Book timeline.");
    } finally {
      setLogsLoading(false);
    }
  }

  function openDocument(item) {
    if (!item?.dayBookId) return;
    router.push({
      pathname: "/(app)/receipt",
      params: { dayBookId: String(item.dayBookId) }
    });
  }

  return (
    <View>
      <View style={[styles.panelHeader, phone && styles.panelHeaderPhone]}>
        <View style={styles.flex}>
          <Text style={styles.title}>Day Book</Text>
          <Text style={styles.subtitle}>
            {totalCount} entr{totalCount === 1 ? "y" : "ies"}
          </Text>
        </View>
        {manager ? (
          <Button title="Add debit / credit entry" compact onPress={openCreate} style={phone && styles.headerButtonPhone} />
        ) : null}
      </View>

      <Card style={styles.serverFilters}>
        <Text style={styles.filterTitle}>Day Book filters</Text>
        <View style={styles.filterGrid}>
          <View style={[styles.filterCell, phone && styles.filterCellPhone]}>
            <Select
              label="Entry type"
              value={entryTypeFilter}
              options={typeFilterOptions}
              onChange={changeEntryTypeFilterValue}
            />
          </View>
          <View style={[styles.filterCell, phone && styles.filterCellPhone]}>
            <Select label="Category" value={categoryFilter} options={filterCategoryOptions} onChange={value => { setCategoryFilter(value); setSubCategoryFilter(""); if (value) { accountsApi.getPaymentSubCategoriesByCategory(Number(value), entryTypeFilter || undefined).then(result => setSubCategories((Array.isArray(result) ? result : []).filter(item => item?.isActive !== false))).catch(() => {}); } else setSubCategories([]); }} />
          </View>
          <View style={[styles.filterCell, phone && styles.filterCellPhone]}>
            <Select label="Subcategory" value={subCategoryFilter} options={filterSubCategoryOptions} onChange={setSubCategoryFilter} disabled={!categoryFilter} />
          </View>
          <View style={[styles.filterCell, phone && styles.filterCellPhone]}>
            <Select
              label="Payment method"
              value={paymentMethodFilter}
              options={filterMethodOptions}
              onChange={setPaymentMethodFilter}
            />
          </View>
        </View>
        {entryTypeFilter || categoryFilter || subCategoryFilter || paymentMethodFilter ? (
          <Button
            title="Clear Day Book filters"
            compact
            variant="outline"
            onPress={() => {
              setEntryTypeFilter("");
              setCategoryFilter("");
              setSubCategoryFilter("");
              setPaymentMethodFilter("");
            }}
          />
        ) : null}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}

      {visibleEntries.map(item => (
        <Card key={String(item.dayBookId)} style={styles.entryCard}>
          <View style={[styles.row, phone && styles.rowPhone]}>
            <View style={styles.flex}>
              <Text style={styles.entryTitle}>{item.categoryName || "Day Book entry"}{item.subCategoryName ? ` · ${item.subCategoryName}` : ""}</Text>
              <Text style={styles.meta}>
                {item.paymentMethodName || "-"} · {formatDateTime(item.transactionDate || item.createdAt)}
              </Text>
              {item.bankAccountName ? (
                <Text style={styles.meta}>Bank: {item.bankAccountName}</Text>
              ) : null}
              {item.paymentReferenceNo ? (
                <Text style={styles.meta}>Ref: {item.paymentReferenceNo}</Text>
              ) : null}
              {isDebitEntry(item.entryType)
                ? item.voucherNo ? <Text style={styles.meta}>Voucher: {item.voucherNo}</Text> : null
                : item.receiptNo ? <Text style={styles.meta}>Receipt: {item.receiptNo}</Text> : null}
              {item.remarks ? <Text style={styles.meta}>{item.remarks}</Text> : null}
              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.typeBadge,
                    isDebitEntry(item.entryType) ? styles.debitBadge : styles.creditBadge
                  ]}
                >
                  {item.entryType || "-"}
                </Text>
                {item.isRefunded ? (
                  <Text style={styles.refundedBadge}>REFUNDED</Text>
                ) : null}
              </View>
            </View>
            <Text
              style={[
                styles.amount,
                phone && styles.amountPhone,
                isDebitEntry(item.entryType) && styles.debitAmount
              ]}
            >
              {isDebitEntry(item.entryType) ? "−" : "+"}
              {money(item.amount)}
            </Text>
          </View>

          {manager ? (
            <View style={styles.actions}>
              <Button
                title={isDebitEntry(item.entryType) ? "Voucher" : "Receipt"}
                compact
                variant="outline"
                onPress={() => openDocument(item)}
              />
              <Button
                title="Details"
                compact
                variant="outline"
                onPress={() => openDetail(item.dayBookId)}
              />
              <Button
                title="Edit"
                compact
                variant="outline"
                onPress={() => editEntry(item.dayBookId)}
              />
              <Button
                title="Timeline"
                compact
                variant="outline"
                onPress={() => openLogs(item.dayBookId)}
              />
              {canRefund && !item.isRefunded ? (
                <Button
                  title="Refund"
                  compact
                  variant="danger"
                  onPress={() => refundEntry(item)}
                />
              ) : null}
              {canDelete ? (
                <Button
                  title="Delete"
                  compact
                  variant="danger"
                  onPress={() => deleteEntry(item)}
                />
              ) : null}
            </View>
          ) : null}
        </Card>
      ))}

      {!loading && !visibleEntries.length ? (
        <Card>
          <Text style={styles.meta}>No Day Book entries found.</Text>
        </Card>
      ) : null}

      <View style={[styles.pagination, narrow && styles.paginationNarrow]}>
        <Button
          title="Previous"
          compact
          variant="outline"
          disabled={loading || pageNumber <= 1}
          onPress={() => setPageNumber(page => Math.max(1, page - 1))}
        />
        <Text style={styles.pageText}>
          {pageNumber} / {totalPages}
        </Text>
        <Button
          title="Next"
          compact
          variant="outline"
          disabled={loading || pageNumber >= totalPages}
          onPress={() => setPageNumber(page => Math.min(totalPages, page + 1))}
        />
      </View>

      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setShowForm(false)}
      >
        <KeyboardAvoidingView
          style={[styles.backdrop, phone && styles.backdropPhone]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.formSheet, phone && styles.formSheetPhone]}>
            <View style={[styles.modalHeader, phone && styles.modalHeaderPhone]}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>
                  {editingId ? "Edit Day Book entry" : "Add debit / credit entry"}
                </Text>
                <Text style={styles.subtitle}>
                  Record a debit or credit entry with its payment method and details.
                </Text>
              </View>
              <Pressable disabled={saving} onPress={() => setShowForm(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              {formError ? (
                <View style={styles.modalErrorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={21} color={colors.danger} />
                  <View style={styles.flex}>
                    <Text style={styles.modalErrorTitle}>Action required</Text>
                    <Text style={styles.modalErrorText}>{formError}</Text>
                  </View>
                </View>
              ) : null}
              <Select
                label="Entry type"
                value={form.entryType}
                options={ENTRY_TYPES}
                placeholder="Select credit or debit"
                onChange={changeEntryType}
              />
              <Select
                label="Category"
                value={form.categoryId}
                options={categoryOptions}
                onChange={changeCategory}
                placeholder="Select category"
              />
              {form.categoryId && subCategoryOptions.length ? (
                <Select
                  label="Subcategory"
                  value={form.subCategoryId}
                  options={subCategoryOptions}
                  onChange={changeSubCategory}
                  placeholder="Select subcategory"
                />
              ) : null}
              {fields.length ? (
                <View style={styles.dynamicSection}>
                  <Text style={styles.dynamicTitle}>Additional details</Text>
                  {fields.map(field => {
                    const id = String(field.fieldId);
                    const type = String(field.fieldType || "TEXT").toUpperCase();
                    if (["BOOLEAN", "CHECKBOX", "YES_NO", "YESNO"].includes(type)) {
                      return <Select key={id} label={`${field.fieldName || field.fieldKey || `Field ${field.fieldId}`}${field.isRequired ? " *" : ""}`} value={form.fieldValues[id] || ""} options={[{ label: "Yes", value: "true" }, { label: "No", value: "false" }]} onChange={value => changeFieldValue(id, value)} />;
                    }
                    return <Input key={id} label={`${field.fieldName || field.fieldKey || `Field ${field.fieldId}`}${field.isRequired ? " *" : ""}`} value={form.fieldValues[id] || ""} multiline={type === "TEXTAREA" || type === "MULTILINE"} keyboardType={type === "NUMBER" || type === "DECIMAL" ? "decimal-pad" : "default"} onChangeText={value => changeFieldValue(id, value)} />;
                  })}
                </View>
              ) : null}
              <Input
                label="Amount"
                value={form.amount}
                keyboardType="decimal-pad"
                onChangeText={amount => setForm(current => ({ ...current, amount }))}
              />
              <Select
                label="Payment method"
                value={form.paymentMethodId}
                options={methodOptions}
                onChange={paymentMethodId =>
                  setForm(current => ({ ...current, paymentMethodId }))
                }
                placeholder="Select payment method"
              />
              <Select
                label="Bank account"
                value={form.bankAccountId}
                options={bankOptions}
                onChange={bankAccountId =>
                  setForm(current => ({ ...current, bankAccountId }))
                }
                placeholder="Select bank account"
              />
              <DatePickerField
                label="Transaction date"
                value={form.transactionDate}
                required
                onChange={transactionDate =>
                  setForm(current => ({ ...current, transactionDate }))
                }
              />
              <Input
                label="Reference number"
                value={form.paymentReferenceNo}
                onChangeText={paymentReferenceNo =>
                  setForm(current => ({ ...current, paymentReferenceNo }))
                }
              />
              <Input
                label="Remarks"
                value={form.remarks}
                multiline
                onChangeText={remarks => setForm(current => ({ ...current, remarks }))}
              />
              <Button
                title={editingId ? "Update entry" : "Save entry"}
                loading={saving}
                onPress={saveEntry}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(detail) || detailLoading}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <View style={[styles.backdrop, phone && styles.backdropPhone]}>
          <View style={[styles.detailSheet, phone && styles.detailSheetPhone]}>
            {detailLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : detail ? (
              <ScrollView>
                <View style={[styles.modalHeader, phone && styles.modalHeaderPhone]}>
                  <View style={styles.flex}>
                    <Text style={styles.modalTitle}>Day Book #{detail.dayBookId}</Text>
                    <Text style={styles.subtitle}>
                      {detail.entryType || "-"}{detail.isRefunded ? " · Refunded" : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setDetail(null)}>
                    <Text style={styles.close}>×</Text>
                  </Pressable>
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{detail.categoryName || "-"}{detail.subCategoryName ? ` · ${detail.subCategoryName}` : ""}</Text>
                  {Array.isArray(detail.fieldValues) && detail.fieldValues.length ? (
                    <View>{detail.fieldValues.map(field => <View key={String(field.fieldId)}><Text style={styles.detailLabel}>{field.fieldName || `Field ${field.fieldId}`}</Text><Text style={styles.detailValue}>{field.value || "-"}</Text></View>)}</View>
                  ) : null}
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      isDebitEntry(detail.entryType) && styles.debitAmount
                    ]}
                  >
                    {isDebitEntry(detail.entryType) ? "−" : "+"}
                    {money(detail.amount)}
                  </Text>
                  <Text style={styles.detailLabel}>Payment method</Text>
                  <Text style={styles.detailValue}>{detail.paymentMethodName || "-"}</Text>
                  <Text style={styles.detailLabel}>Bank account</Text>
                  <Text style={styles.detailValue}>{detail.bankAccountName || "-"}</Text>
                  <Text style={styles.detailLabel}>Reference</Text>
                  <Text style={styles.detailValue}>{detail.paymentReferenceNo || "-"}</Text>
                  {isDebitEntry(detail.entryType) ? (
                    <>
                      <Text style={styles.detailLabel}>Voucher number</Text>
                      <Text style={styles.detailValue}>{detail.voucherNo || "-"}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.detailLabel}>Receipt number</Text>
                      <Text style={styles.detailValue}>{detail.receiptNo || "-"}</Text>
                    </>
                  )}
                  <Text style={styles.detailLabel}>Remarks</Text>
                  <Text style={styles.detailValue}>{detail.remarks || "-"}</Text>
                  <Text style={styles.detailLabel}>Transaction date</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(detail.transactionDate || detail.createdAt)}
                  </Text>
                  <Text style={styles.detailLabel}>Recorded by</Text>
                  <Text style={styles.detailValue}>
                    {detail.createdByName || "-"}
                    {detail.createdByItsNo ? ` · ITS ${detail.createdByItsNo}` : ""}
                  </Text>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{formatDateTime(detail.createdAt)}</Text>
                  {detail.updatedAt ? (
                    <>
                      <Text style={styles.detailLabel}>Last updated by</Text>
                      <Text style={styles.detailValue}>
                        {detail.updatedByName || "-"}
                        {detail.updatedByItsNo ? ` · ITS ${detail.updatedByItsNo}` : ""}
                      </Text>
                      <Text style={styles.detailLabel}>Last updated</Text>
                      <Text style={styles.detailValue}>{formatDateTime(detail.updatedAt)}</Text>
                    </>
                  ) : null}

                  {manager ? (
                    <View style={styles.detailActions}>
                      <Button
                        title={isDebitEntry(detail.entryType) ? "Open voucher" : "Open receipt"}
                        variant="outline"
                        onPress={() => {
                          const entry = detail;
                          setDetail(null);
                          openDocument(entry);
                        }}
                      />
                      <Button
                        title="Edit entry"
                        variant="outline"
                        onPress={() => {
                          const id = detail.dayBookId;
                          setDetail(null);
                          editEntry(id);
                        }}
                      />
                      <Button
                        title="View timeline"
                        variant="outline"
                        onPress={() => {
                          const id = detail.dayBookId;
                          setDetail(null);
                          openLogs(id);
                        }}
                      />
                      {canRefund && !detail.isRefunded ? (
                        <Button
                          title="Refund entry"
                          variant="danger"
                          onPress={() => refundEntry(detail)}
                        />
                      ) : null}
                      {canDelete ? (
                        <Button
                          title="Delete entry"
                          variant="danger"
                          onPress={() => deleteEntry(detail)}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(logs) || logsLoading}
        transparent
        animationType="fade"
        onRequestClose={() => setLogs(null)}
      >
        <View style={[styles.backdrop, phone && styles.backdropPhone]}>
          <View style={[styles.detailSheet, phone && styles.detailSheetPhone]}>
            {logsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : logs ? (
              <ScrollView>
                <View style={[styles.modalHeader, phone && styles.modalHeaderPhone]}>
                  <View style={styles.flex}>
                    <Text style={styles.modalTitle}>Day Book #{logs.dayBookId} timeline</Text>
                    <Text style={styles.subtitle}>
                      {logs.items.length} activit{logs.items.length === 1 ? "y" : "ies"}
                    </Text>
                  </View>
                  <Pressable onPress={() => setLogs(null)}>
                    <Text style={styles.close}>×</Text>
                  </Pressable>
                </View>
                <View style={styles.detailContent}>
                  <ActivityTimeline
                    entries={logs.items}
                    entityLabel="Day Book entry"
                    getKey={log => String(log.dayBookLogId)}
                    formatDateTime={formatDateTime}
                  />
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  panelHeaderPhone: { alignItems: "stretch", flexWrap: "wrap", gap: spacing.sm },
  headerButtonPhone: { width: "100%" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.muted, marginTop: 3, fontSize: 12 },
  serverFilters: { marginBottom: spacing.md },
  filterTitle: { color: colors.text, fontWeight: "800", marginBottom: spacing.sm },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  filterCell: { flex: 1, minWidth: 220 },
  filterCellPhone: { minWidth: "100%" },
  dynamicSection: { marginTop: spacing.sm, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceTint },
  dynamicTitle: { color: colors.text, fontWeight: "800", marginBottom: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  entryCard: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowPhone: { flexWrap: "wrap", gap: spacing.sm },
  entryTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  amount: { color: colors.primaryStrong, fontWeight: "900", fontSize: 17 },
  amountPhone: { width: "100%", marginTop: spacing.xs },
  debitAmount: { color: colors.danger },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800"
  },
  debitBadge: { color: colors.danger, backgroundColor: colors.dangerSoft },
  creditBadge: { color: colors.primaryStrong, backgroundColor: colors.primarySoft },
  refundedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    backgroundColor: colors.background
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md
  },
  pageText: { color: colors.muted, fontWeight: "700" },
  paginationNarrow: { gap: spacing.xs },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.4)",
    justifyContent: "center",
    padding: spacing.md
  },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  formSheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  formSheetPhone: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  detailSheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "88%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  detailSheetPhone: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  modalHeaderPhone: { padding: spacing.md },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  close: { color: colors.muted, fontSize: 30, lineHeight: 30 },
  formScroll: { flexGrow: 0 },
  formContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  modalErrorBanner: { width: "100%", flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: "#F0C9C9", backgroundColor: colors.dangerSoft },
  modalErrorTitle: { color: colors.danger, fontSize: 13, fontWeight: "900" },
  modalErrorText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 2 },
  detailContent: { padding: spacing.lg },
  detailLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: spacing.md
  },
  detailValue: { color: colors.text, fontSize: 15, marginTop: 4 },
  detailActions: { gap: spacing.sm, marginTop: spacing.xl },
  logCard: { marginBottom: spacing.md },
  logData: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  }
});
