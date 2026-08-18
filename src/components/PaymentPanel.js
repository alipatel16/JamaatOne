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
import { router } from "expo-router";

import { accountsApi } from "../api/accountsApi";
import { mumineenApi } from "../api/mumineenApi";
import { colors, radius, spacing } from "../theme";
import ActivityTimeline from "./ActivityTimeline";
import Button from "./Button";
import Card from "./Card";
import DatePickerField, { localDateValue, transactionDateToIso } from "./DatePickerField";
import Input from "./Input";
import RemoteMumineenSelect from "./RemoteMumineenSelect";
import Select from "./Select";

const PAGE_SIZE = 20;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function createEmptyForm() {
  return {
    muminId: "",
    categoryId: "",
    subCategoryId: "",
    amount: "",
    paymentMethodId: "",
    bankAccountId: "",
    paymentReference: "",
    remarks: "",
    transactionDate: localDateValue(),
    fieldValues: {}
  };
}

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizeFieldType(field) {
  return String(field?.fieldType || "TEXT")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isMemberField(field) {
  const type = normalizeFieldType(field);
  if (
    ["MEMBER", "MUMIN", "MUMINEEN", "FAMILY", "FAMILY_MEMBER", "FAMILYMEMBER"].includes(type)
  ) {
    return true;
  }

  // The API currently defines fieldType but does not expose a separate option-source
  // schema for arbitrary dropdowns. A dropdown whose field name/key clearly means
  // family/member is therefore resolved through the Mumineen HOF endpoint.
  if (!["DROPDOWN", "SELECT"].includes(type)) return false;
  const semantic = `${field?.fieldKey || ""} ${field?.fieldName || ""}`.toLowerCase();
  return /(member|mumin|paid.?for|family|student|child)/.test(semantic);
}

function hasMemberField(fields) {
  return (fields || []).some(isMemberField);
}

function MonthPickerField({ label, value, onChange, required }) {
  const [visible, setVisible] = useState(false);
  const parsedYear = Number(String(value || "").split("-")[0]);
  const [year, setYear] = useState(
    Number.isInteger(parsedYear) && parsedYear > 1900
      ? parsedYear
      : new Date().getFullYear()
  );

  useEffect(() => {
    const next = Number(String(value || "").split("-")[0]);
    if (Number.isInteger(next) && next > 1900) setYear(next);
  }, [value]);

  const displayValue = useMemo(() => {
    if (!value) return "";
    const [selectedYear, selectedMonth] = String(value).split("-");
    const monthIndex = Number(selectedMonth) - 1;
    if (!selectedYear || monthIndex < 0 || monthIndex > 11) return value;
    return `${MONTHS[monthIndex]} ${selectedYear}`;
  }, [value]);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable style={styles.selectLike} onPress={() => setVisible(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {displayValue || "Select month"}
        </Text>
        <Text>⌄</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.monthSheet} onPress={() => {}}>
            <View style={styles.monthHeader}>
              <Pressable
                onPress={() => setYear(current => current - 1)}
                style={styles.monthNav}
              >
                <Text style={styles.monthNavText}>‹</Text>
              </Pressable>
              <Text style={styles.monthYear}>{year}</Text>
              <Pressable
                onPress={() => setYear(current => current + 1)}
                style={styles.monthNav}
              >
                <Text style={styles.monthNavText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((month, index) => {
                const monthValue = `${year}-${String(index + 1).padStart(2, "0")}`;
                const selected = monthValue === value;
                return (
                  <Pressable
                    key={month}
                    style={[styles.monthCell, selected && styles.monthCellSelected]}
                    onPress={() => {
                      onChange(monthValue);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        selected && styles.monthCellTextSelected
                      ]}
                    >
                      {month.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DynamicFields({ fields, values, onChange, payer, family, familyLoading }) {
  const familyOptions = useMemo(
    () =>
      (family || []).map(item => {
        const memberName =
          item.fullName ||
          [item.firstName, item.fatherName, item.surname].filter(Boolean).join(" ") ||
          "Unnamed";
        return {
          label: `${memberName} · ITS ${item.itsId || "-"}`,
          // Dynamic payment field values are strings. For Madrasa/family-member
          // fields the backend should receive the selected person's NAME, while
          // the top-level muminId remains the payer selected above.
          value: memberName
        };
      }),
    [family]
  );

  if (!fields.length) return null;

  return (
    <View style={styles.dynamicSection}>
      <Text style={styles.dynamicTitle}>Additional payment details</Text>
      {fields.map(field => {
        const id = String(field.fieldId);
        const type = normalizeFieldType(field);
        const value = values[id] || "";
        const label = field.fieldName || field.fieldKey || `Field ${field.fieldId}`;

        if (isMemberField(field)) {
          return (
            <View key={id}>
              <Select
                label={`${label}${field.isRequired ? " *" : ""}`}
                value={value}
                options={familyOptions}
                onChange={next => onChange(id, next)}
                placeholder={
                  !payer
                    ? "Select payer first"
                    : familyLoading
                      ? "Loading family members..."
                      : familyOptions.length
                        ? "Select family member"
                        : "No family members found"
                }
              />
              {!payer ? (
                <Text style={styles.helper}>Select the payer first.</Text>
              ) : null}
            </View>
          );
        }

        if (["MONTH", "MONTH_PICKER", "MONTHPICKER"].includes(type)) {
          return (
            <MonthPickerField
              key={id}
              label={label}
              required={field.isRequired}
              value={value}
              onChange={next => onChange(id, next)}
            />
          );
        }

        if (["BOOLEAN", "CHECKBOX", "YES_NO", "YESNO"].includes(type)) {
          return (
            <Select
              key={id}
              label={`${label}${field.isRequired ? " *" : ""}`}
              value={value}
              options={[
                { label: "Yes", value: "true" },
                { label: "No", value: "false" }
              ]}
              onChange={next => onChange(id, next)}
              placeholder="Select"
            />
          );
        }

        return (
          <View key={id}>
            <Input
              label={`${label}${field.isRequired ? " *" : ""}`}
              value={value}
              multiline={type === "TEXTAREA" || type === "MULTILINE"}
              keyboardType={
                type === "NUMBER" || type === "DECIMAL" ? "decimal-pad" : "default"
              }
              placeholder={
                type === "DATE"
                  ? "YYYY-MM-DD"
                  : type === "DROPDOWN" || type === "SELECT"
                    ? "Enter value"
                    : "Enter value"
              }
              onChangeText={next => onChange(id, next)}
            />
          </View>
        );
      })}
    </View>
  );
}

function paymentFilterDate(value, endOfDay = false) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`;
}

export default function PaymentPanel({
  manager,
  canEdit = false,
  canRefund = false,
  filters = {},
  createRequestKey = 0,
  onCreateRequestHandled,
  hideCreateButton = false
}) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [methods, setMethods] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configurationLoading, setConfigurationLoading] = useState(false);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [family, setFamily] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logs, setLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter(item => item.isActive !== false)
        .map(item => ({
          label: item.categoryName || `Category ${item.categoryId}`,
          value: String(item.categoryId)
        })),
    [categories]
  );

  const subCategoryOptions = useMemo(
    () =>
      subCategories
        .filter(item => item.isActive !== false)
        .map(item => ({
          label: item.subCategoryName || `Subcategory ${item.subCategoryId}`,
          value: String(item.subCategoryId)
        })),
    [subCategories]
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

  const bankOptions = useMemo(() => {
    const selectedCategoryId = String(form.categoryId || "");
    return bankAccounts
      .filter(item => item?.isActive !== false)
      .filter(item => {
        if (!selectedCategoryId) return true;
        const assigned = Array.isArray(item.categories) ? item.categories : [];
        // Legacy accounts without category assignments remain available so
        // existing installations do not lose working payment destinations.
        if (!assigned.length) return true;
        return assigned.some(
          category => String(category.categoryId) === selectedCategoryId
        );
      })
      .map(item => ({
        label: `${item.bankAccountName || item.bankName || "Bank account"}${
          item.bankAccountNumber ? ` · ${String(item.bankAccountNumber).slice(-4)}` : ""
        }`,
        value: String(item.bankAccountId)
      }));
  }, [bankAccounts, form.categoryId]);

  useEffect(() => {
    setPageNumber(1);
    loadPayments(1);
  }, [filters.muminId, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (pageNumber !== 1) loadPayments(pageNumber);
  }, [pageNumber]);

  useEffect(() => {
    if (manager && createRequestKey > 0) {
      onCreateRequestHandled?.();
      openCreate();
    }
  }, [createRequestKey, manager]);

  async function loadPaymentConfiguration() {
    try {
      setConfigurationLoading(true);
      setError("");
      const [categoryData, methodData, bankData] = await Promise.all([
        accountsApi.getPaymentCategories(),
        accountsApi.getPaymentMethods(),
        accountsApi.getBankAccounts()
      ]);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setMethods(Array.isArray(methodData) ? methodData : []);
      setBankAccounts(
        (Array.isArray(bankData) ? bankData : []).filter(item => item?.isActive !== false)
      );
      return {
        categories: Array.isArray(categoryData) ? categoryData : [],
        methods: Array.isArray(methodData) ? methodData : [],
        bankAccounts: Array.isArray(bankData) ? bankData : []
      };
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment configuration.");
      throw requestError;
    } finally {
      setConfigurationLoading(false);
    }
  }

  async function loadPayments(page = 1) {
    try {
      setLoading(true);
      setError("");
      const result = await accountsApi.getPayments({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        muminId: filters.muminId ? Number(filters.muminId) : undefined,
        fromDate: paymentFilterDate(filters.fromDate),
        toDate: paymentFilterDate(filters.toDate, true)
      });
      setPayments(
        (Array.isArray(result?.items) ? result.items : []).filter(
          item => item?.isActive !== false
        )
      );
      setTotalCount(Number(result?.totalCount || 0));
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (requestError) {
      setPayments([]);
      setError(requestError.message || "Unable to load payment history.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubCategories(categoryId) {
    if (!categoryId) {
      setSubCategories([]);
      setFields([]);
      return [];
    }

    try {
      setSubCategoriesLoading(true);
      const result = await accountsApi.getPaymentSubCategoriesByCategory(
        Number(categoryId)
      );
      const active = (Array.isArray(result) ? result : []).filter(
        item => item.isActive !== false
      );
      setSubCategories(active);
      return active;
    } finally {
      setSubCategoriesLoading(false);
    }
  }

  async function loadFields(subCategoryId, payer = selectedPayer) {
    if (!subCategoryId) {
      setFields([]);
      setFamily([]);
      return [];
    }

    try {
      setFieldsLoading(true);
      const result = await accountsApi.getPaymentFieldsBySubCategory(
        Number(subCategoryId)
      );
      const active = (Array.isArray(result) ? result : [])
        .filter(item => item.isActive !== false)
        .sort(
          (a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        );
      setFields(active);

      if (payer && hasMemberField(active)) {
        await loadFamily(payer);
      } else {
        setFamily([]);
      }

      return active;
    } finally {
      setFieldsLoading(false);
    }
  }

  async function loadFamily(payer) {
    if (!payer) {
      setFamily([]);
      return;
    }

    const hofId = payer.hofId || payer.itsId;
    if (!hofId) {
      setFamily([payer]);
      return;
    }

    try {
      setFamilyLoading(true);
      const result = await mumineenApi.getByHof(hofId);
      const members = Array.isArray(result) ? result : [];
      setFamily(members.length ? members : [payer]);
    } catch {
      setFamily([payer]);
    } finally {
      setFamilyLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm());
    setSelectedPayer(null);
    setSubCategories([]);
    setFields([]);
    setFamily([]);
    setError("");
  }

  async function openCreate() {
    resetForm();
    setShowForm(true);
    try {
      // Refresh category + method configuration every time the dialog opens so
      // Super Admin changes are reflected immediately without restarting app.
      await loadPaymentConfiguration();
    } catch {
      // The dialog remains open and surfaces the API error for retry/visibility.
    }
  }

  async function changeCategory(categoryId) {
    setForm(current => ({
      ...current,
      categoryId,
      subCategoryId: "",
      bankAccountId: "",
      fieldValues: {}
    }));
    setFields([]);
    setFamily([]);

    try {
      await loadSubCategories(categoryId);
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment subcategories.");
    }
  }

  async function changeSubCategory(subCategoryId) {
    setForm(current => ({
      ...current,
      subCategoryId,
      fieldValues: {}
    }));

    try {
      await loadFields(subCategoryId);
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment fields.");
    }
  }

  function changeFieldValue(fieldId, value) {
    setForm(current => ({
      ...current,
      fieldValues: {
        ...current.fieldValues,
        [String(fieldId)]: value
      }
    }));
  }

  async function handlePayerChange(muminId, item) {
    setSelectedPayer(item);
    setForm(current => ({
      ...current,
      muminId,
      fieldValues: {}
    }));

    // Only call GET /Mumineen/hof/{hofId} when the selected subcategory has a
    // family/member field. Categories that do not need family data avoid that call.
    if (hasMemberField(fields)) {
      await loadFamily(item);
    } else {
      setFamily([]);
    }
  }

  function validateForm() {
    if (!form.muminId) return "Please search and select the Mumin making the payment.";
    if (!form.categoryId) return "Please select a payment category.";
    if (subCategories.length > 0 && !form.subCategoryId) {
      return "Please select a payment subcategory.";
    }
    if (!form.amount || Number(form.amount) <= 0) return "Enter a valid payment amount.";
    if (!form.paymentMethodId) return "Please select a payment method.";
    if (!form.bankAccountId) return "Please select a bank account.";
    if (!form.transactionDate) return "Please select a transaction date.";

    const missing = fields.find(
      field =>
        field.isRequired &&
        !String(form.fieldValues[String(field.fieldId)] || "").trim()
    );
    if (missing) return `${missing.fieldName || "Required field"} is required.`;
    return "";
  }

  function buildPayload() {
    const fieldValues = fields
      .map(field => ({
        fieldId: Number(field.fieldId),
        value: String(form.fieldValues[String(field.fieldId)] || "").trim()
      }))
      .filter(item => item.value !== "");

    return {
      ...(editingId ? {} : { muminId: Number(form.muminId) }),
      categoryId: Number(form.categoryId),
      // No configured/selected subcategory must be sent as null, not 0.
      subCategoryId: form.subCategoryId ? Number(form.subCategoryId) : null,
      amount: Number(form.amount),
      paymentMethodId: Number(form.paymentMethodId),
      bankAccountId: Number(form.bankAccountId),
      paymentReference: form.paymentReference.trim() || null,
      remarks: form.remarks.trim() || null,
      transactionDate: transactionDateToIso(form.transactionDate),
      fieldValues
    };
  }

  async function savePayment() {
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = buildPayload();
      if (editingId) {
        await accountsApi.updatePayment(editingId, payload);
      } else {
        await accountsApi.createPayment(payload);
      }
      setShowForm(false);
      resetForm();
      if (pageNumber === 1) await loadPayments(1);
      else setPageNumber(1);
    } catch (requestError) {
      setError(requestError.message || "Unable to save payment.");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(paymentId) {
    try {
      setDetailLoading(true);
      setError("");
      setDetail(await accountsApi.getPayment(paymentId));
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function editPayment(paymentId) {
    if (!canEdit) return;

    try {
      setDetailLoading(true);
      setError("");
      await loadPaymentConfiguration();

      const item = await accountsApi.getPayment(paymentId);
      const payer = await mumineenApi.getById(item.muminId);
      const loadedSubCategories = await loadSubCategories(item.categoryId);

      const hasSavedSubCategory = Number(item.subCategoryId || 0) > 0;
      const loadedFields = hasSavedSubCategory
        ? await loadFields(item.subCategoryId, payer)
        : [];

      const savedValues = {};
      (item.fieldValues || []).forEach(field => {
        savedValues[String(field.fieldId)] = field.value || "";
      });
      loadedFields.forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(savedValues, String(field.fieldId))) {
          savedValues[String(field.fieldId)] = "";
        }
      });

      setSelectedPayer(payer);
      setEditingId(item.paymentId);
      setForm({
        muminId: String(item.muminId),
        categoryId: String(item.categoryId),
        subCategoryId:
          hasSavedSubCategory &&
          loadedSubCategories.some(
            sub => String(sub.subCategoryId) === String(item.subCategoryId)
          )
            ? String(item.subCategoryId)
            : "",
        amount: String(item.amount ?? ""),
        paymentMethodId: String(item.paymentMethodId),
        bankAccountId: item.bankAccountId ? String(item.bankAccountId) : "",
        paymentReference: item.paymentReference || "",
        remarks: item.remarks || "",
        transactionDate: localDateValue(item.transactionDate || item.createdAt),
        fieldValues: savedValues
      });
      setShowForm(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to edit payment.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function openLogs(paymentId) {
    try {
      setLogsLoading(true);
      setError("");
      const result = await accountsApi.getPaymentLogs(paymentId);
      setLogs({
        paymentId,
        items: Array.isArray(result) ? result : []
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment timeline.");
    } finally {
      setLogsLoading(false);
    }
  }

  async function refundPayment(item) {
    if (!canRefund) return;

    const proceed =
      Platform.OS === "web"
        ? globalThis.confirm?.(`Delete payment #${item.paymentId}?`) ?? false
        : await new Promise(resolve => {
            Alert.alert(
              "Delete payment?",
              "The payment will remain in history with its refunded status.",
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => resolve(true)
                }
              ]
            );
          });

    if (!proceed) return;

    try {
      setError("");
      await accountsApi.refundPayment(item.paymentId);
      await loadPayments(pageNumber);
      if (detail?.paymentId === item.paymentId) {
        setDetail(await accountsApi.getPayment(item.paymentId));
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to refund payment.");
    }
  }

  return (
    <View>
      <View style={[styles.panelHeader, phone && styles.panelHeaderPhone]}>
        <View style={styles.flex}>
          <Text style={styles.title}>Payment history</Text>
          <Text style={styles.subtitle}>
            {totalCount} payment{totalCount === 1 ? "" : "s"}
          </Text>
        </View>
        {manager && !hideCreateButton ? (
          <Button title="Add payment" compact onPress={openCreate} style={phone && styles.headerButtonPhone} />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}

      {payments.map(item => (
        <Pressable
          key={String(item.paymentId)}
          onPress={() => openDetail(item.paymentId)}
        >
          <Card style={styles.paymentCard}>
            <View style={[styles.row, phone && styles.rowPhone]}>
              <View style={styles.flex}>
                <Text style={styles.paymentTitle}>
                  {item.categoryName || "Payment"}
                  {item.subCategoryName ? ` · ${item.subCategoryName}` : ""}
                </Text>
                <Text style={styles.member}>
                  {item.muminName || `Mumin ${item.muminId}`}
                </Text>
                <Text style={styles.meta}>
                  {item.paymentMethodName || "-"} · {formatDateTime(item.transactionDate || item.createdAt)}
                </Text>
                {item.bankAccountName ? (
                  <Text style={styles.meta}>Bank: {item.bankAccountName}</Text>
                ) : null}
                {item.paymentReference ? (
                  <Text style={styles.meta}>Ref: {item.paymentReference}</Text>
                ) : null}
                <Text style={styles.status}>{item.status || "-"}</Text>
              </View>
              <Text style={[styles.amount, phone && styles.amountPhone]}>{money(item.amount)}</Text>
            </View>

            <View style={styles.actions}>
              <Button
                title="Receipt"
                compact
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/receipt",
                    params: { paymentId: String(item.paymentId) }
                  })
                }
              />
              <Button
                title="Details"
                compact
                variant="outline"
                onPress={() => openDetail(item.paymentId)}
              />
              {manager && canEdit ? (
                <Button
                  title="Edit"
                  compact
                  variant="outline"
                  onPress={() => editPayment(item.paymentId)}
                />
              ) : null}
              <Button
                title="Timeline"
                compact
                variant="outline"
                onPress={() => openLogs(item.paymentId)}
              />
              {manager && canRefund && String(item.status || "").toUpperCase() !== "REFUNDED" ? (
                <Button
                  title="Delete"
                  compact
                  variant="danger"
                  onPress={() => refundPayment(item)}
                />
              ) : null}
            </View>
          </Card>
        </Pressable>
      ))}

      {!loading && !payments.length ? (
        <Card>
          <Text style={styles.meta}>No payments found.</Text>
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
                  {editingId ? "Edit payment" : "Add payment"}
                </Text>
                <Text style={styles.subtitle}>
                  Record a payment with the configured category and payment details.
                </Text>
              </View>
              <Pressable onPress={() => !saving && setShowForm(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.formCard, phone && styles.formCardPhone]}>
                <Text style={styles.formSectionTitle}>Payment member</Text>
                <RemoteMumineenSelect
                  label="Search and select Mumin"
                  value={form.muminId}
                  initialItem={selectedPayer}
                  disabled={Boolean(editingId)}
                  placeholder="Search name, ITS ID, mobile or family ID"
                  onChange={(muminId, item) => handlePayerChange(String(muminId || ""), item)}
                />

                <Text style={styles.formSectionTitle}>Payment for</Text>
                {configurationLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.helper}>Loading categories, payment methods and bank accounts...</Text>
                  </View>
                ) : null}

                <Select
                  label="Payment category"
                  value={form.categoryId}
                  options={categoryOptions}
                  onChange={changeCategory}
                  placeholder="Select category"
                />

                {subCategoriesLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.helper}>Loading subcategories...</Text>
                  </View>
                ) : null}

                {form.categoryId && !subCategoriesLoading && subCategories.length > 0 ? (
                  <Select
                    label="Payment subcategory"
                    value={form.subCategoryId}
                    options={subCategoryOptions}
                    onChange={changeSubCategory}
                    placeholder="Select subcategory"
                  />
                ) : null}

                {form.categoryId && !subCategoriesLoading && subCategories.length === 0 ? (
                  <Text style={styles.infoText}>
                    No subcategory is configured for this category. The payment can continue without additional fields.
                  </Text>
                ) : null}

                {fieldsLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.helper}>Loading configured payment fields...</Text>
                  </View>
                ) : null}

                {!fieldsLoading ? (
                  <DynamicFields
                    fields={fields}
                    values={form.fieldValues}
                    onChange={changeFieldValue}
                    payer={selectedPayer}
                    family={family}
                    familyLoading={familyLoading}
                  />
                ) : null}

                <Text style={styles.formSectionTitle}>Payment details</Text>
                <Input
                  label="Amount"
                  value={form.amount}
                  keyboardType="decimal-pad"
                  onChangeText={amount =>
                    setForm(current => ({ ...current, amount }))
                  }
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
                  placeholder={
                    form.categoryId
                      ? "Select bank account"
                      : "Select payment category first"
                  }
                  disabled={!form.categoryId}
                />
                {form.categoryId && !bankOptions.length ? (
                  <Text style={styles.infoText}>
                    No active bank account is available for this payment category.
                  </Text>
                ) : null}
                <DatePickerField
                  label="Transaction date"
                  value={form.transactionDate}
                  required
                  onChange={transactionDate =>
                    setForm(current => ({ ...current, transactionDate }))
                  }
                />
                <Input
                  label="Reference / cheque / UPI number"
                  value={form.paymentReference}
                  onChangeText={paymentReference =>
                    setForm(current => ({ ...current, paymentReference }))
                  }
                />
                <Input
                  label="Remarks"
                  value={form.remarks}
                  multiline
                  onChangeText={remarks =>
                    setForm(current => ({ ...current, remarks }))
                  }
                />
                <Button
                  title={editingId ? "Update payment" : "Save payment"}
                  loading={saving}
                  disabled={
                    configurationLoading ||
                    subCategoriesLoading ||
                    fieldsLoading ||
                    familyLoading
                  }
                  onPress={savePayment}
                />
              </View>
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
                    <Text style={styles.modalTitle}>
                      Payment #{detail.paymentId}
                    </Text>
                    <Text style={styles.subtitle}>{detail.status || "-"}</Text>
                  </View>
                  <Pressable onPress={() => setDetail(null)}>
                    <Text style={styles.close}>×</Text>
                  </Pressable>
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Member</Text>
                  <Text style={styles.detailValue}>
                    {detail.muminName || detail.muminId}
                  </Text>
                  <Text style={styles.detailLabel}>Payment for</Text>
                  <Text style={styles.detailValue}>
                    {detail.categoryName || "-"}
                    {detail.subCategoryName ? ` · ${detail.subCategoryName}` : ""}
                  </Text>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>{money(detail.amount)}</Text>
                  <Text style={styles.detailLabel}>Payment method</Text>
                  <Text style={styles.detailValue}>
                    {detail.paymentMethodName || "-"}
                  </Text>
                  <Text style={styles.detailLabel}>Bank account</Text>
                  <Text style={styles.detailValue}>
                    {detail.bankAccountName || "-"}
                  </Text>
                  <Text style={styles.detailLabel}>Reference</Text>
                  <Text style={styles.detailValue}>
                    {detail.paymentReference || "-"}
                  </Text>
                  <Text style={styles.detailLabel}>Remarks</Text>
                  <Text style={styles.detailValue}>{detail.remarks || "-"}</Text>
                  <Text style={styles.detailLabel}>Transaction date</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(detail.transactionDate || detail.createdAt)}
                  </Text>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(detail.createdAt)}
                  </Text>

                  {(detail.fieldValues || []).length ? (
                    <View style={styles.detailFields}>
                      <Text style={styles.dynamicTitle}>Additional details</Text>
                      {detail.fieldValues.map((field, index) => (
                        <View
                          key={`${field.fieldId}-${index}`}
                          style={[styles.detailRow, narrow && styles.detailRowNarrow]}
                        >
                          <Text style={[styles.detailLabelInline, narrow && styles.detailLabelInlineNarrow]}>
                            {field.fieldName || `Field ${field.fieldId}`}
                          </Text>
                          <Text style={[styles.detailValueInline, narrow && styles.detailValueInlineNarrow]}>
                            {field.value || "-"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.detailActions}>
                    <Button
                      title="Open receipt"
                      variant="outline"
                      onPress={() => {
                        const paymentId = detail.paymentId;
                        setDetail(null);
                        router.push({
                          pathname: "/(app)/receipt",
                          params: { paymentId: String(paymentId) }
                        });
                      }}
                    />
                    {manager && canEdit ? (
                      <Button
                        title="Edit payment"
                        variant="outline"
                        onPress={() => {
                          const paymentId = detail.paymentId;
                          setDetail(null);
                          editPayment(paymentId);
                        }}
                      />
                    ) : null}
                    <Button
                      title="View timeline"
                      variant="outline"
                      onPress={() => {
                        const paymentId = detail.paymentId;
                        setDetail(null);
                        openLogs(paymentId);
                      }}
                    />
                    {manager && canRefund &&
                    String(detail.status || "").toUpperCase() !== "REFUNDED" ? (
                      <Button
                        title="Delete payment"
                        variant="danger"
                        onPress={() => refundPayment(detail)}
                      />
                    ) : null}
                  </View>
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
                    <Text style={styles.modalTitle}>Payment #{logs.paymentId} timeline</Text>
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
                    entityLabel="Payment"
                    getKey={log => String(log.paymentLogId)}
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
  flex: { flex: 1 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  panelHeaderPhone: { alignItems: "stretch", flexWrap: "wrap", gap: spacing.sm },
  headerButtonPhone: { width: "100%" },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 3, fontSize: 12 },
  error: { color: colors.danger, marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  paymentCard: { marginBottom: spacing.sm, padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowPhone: { flexWrap: "wrap", gap: spacing.sm },
  paymentTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  member: { color: colors.primaryStrong, fontWeight: "800", marginTop: 5 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  status: {
    alignSelf: "flex-start",
    color: colors.primaryStrong,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: "900",
    marginTop: 8,
    fontSize: 10
  },
  amount: { color: colors.primaryStrong, fontWeight: "900", fontSize: 19 },
  amountPhone: { width: "100%", marginTop: spacing.xs },
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
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.md
  },
  backdropPhone: { justifyContent: "flex-end", padding: 0 },
  formSheet: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "92%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden"
  },
  formSheetPhone: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  detailSheet: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "86%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
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
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  close: { color: colors.muted, fontSize: 30, lineHeight: 30 },
  formContent: { padding: spacing.md },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    backgroundColor: colors.surface
  },
  formCardPhone: { borderRadius: 18, padding: spacing.sm },
  formSectionTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 16,
    marginTop: spacing.xs,
    marginBottom: spacing.sm
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  infoText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: -spacing.xs,
    marginBottom: spacing.md
  },
  dynamicSection: { paddingTop: spacing.xs, marginBottom: spacing.sm },
  dynamicTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
    marginBottom: spacing.sm
  },
  helper: {
    color: colors.muted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    fontSize: 12,
    flex: 1
  },
  fieldBlock: { marginBottom: spacing.md },
  label: {
    marginBottom: spacing.xs,
    color: colors.textSoft,
    fontWeight: "700",
    fontSize: 13
  },
  selectLike: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  valueText: { color: colors.text },
  placeholderText: { color: colors.muted },
  monthSheet: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  monthNav: { padding: spacing.sm },
  monthNavText: { fontSize: 28, color: colors.primary },
  monthYear: { fontSize: 18, fontWeight: "800", color: colors.text },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: {
    width: "33.333%",
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md
  },
  monthCellSelected: { backgroundColor: colors.primary },
  monthCellText: { color: colors.text, fontWeight: "700" },
  monthCellTextSelected: { color: "#fff" },
  detailContent: { padding: spacing.lg },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.md
  },
  detailValue: { color: colors.text, fontSize: 15, marginTop: 3 },
  detailFields: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  detailRowNarrow: { flexDirection: "column", gap: 4 },
  detailLabelInline: { color: colors.muted, flex: 1 },
  detailLabelInlineNarrow: { flex: 0 },
  detailValueInline: {
    color: colors.text,
    fontWeight: "700",
    flex: 1,
    textAlign: "right"
  },
  detailValueInlineNarrow: { flex: 0, textAlign: "left" },
  detailActions: { gap: spacing.sm, marginTop: spacing.lg },
  logCard: { marginBottom: spacing.md },
  logData: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  }
});
