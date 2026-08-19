import { apiRequest, liveApiRequest } from "./client";
import { endpoints, liveEndpoints } from "./endpoints";

function withOptionalJamaat(path, jamaatId) {
  if (jamaatId === undefined || jamaatId === null || jamaatId === "") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}jamaatId=${encodeURIComponent(String(jamaatId))}`;
}

function normalizeDayBookPayload(payload) {
  return {
    entryType: payload?.entryType || null,
    paymentFor: payload?.paymentFor || null,
    amount: Number(payload?.amount),
    paymentMethodId: Number(payload?.paymentMethodId),
    paymentReferenceNo: payload?.paymentReferenceNo || null,
    remarks: payload?.remarks || null,
    transactionDate: payload?.transactionDate || null,
    bankAccountId: Number(payload?.bankAccountId)
  };
}

function normalizePaymentPayload(payload, includeMuminId) {
  const fieldValues = Array.isArray(payload?.fieldValues)
    ? payload.fieldValues
        .filter(item => item && item.fieldId != null)
        .map(item => ({
          fieldId: Number(item.fieldId),
          value: item.value == null ? null : String(item.value)
        }))
    : [];

  return {
    ...(includeMuminId ? { muminId: Number(payload?.muminId) } : {}),
    categoryId: Number(payload?.categoryId),
    subCategoryId: payload?.subCategoryId ? Number(payload.subCategoryId) : null,
    amount: Number(payload?.amount),
    paymentMethodId: Number(payload?.paymentMethodId),
    paymentReference: payload?.paymentReference || null,
    remarks: payload?.remarks || null,
    transactionDate: payload?.transactionDate || null,
    bankAccountId: Number(payload?.bankAccountId),
    fieldValues
  };
}

function normalizeBankAccountPayload(payload, includeOpeningBalance = false) {
  return {
    bankAccountName: payload?.bankAccountName || null,
    bankName: payload?.bankName || null,
    bankAccountNumber: payload?.bankAccountNumber || null,
    accountHolderName: payload?.accountHolderName || null,
    ifscCode: payload?.ifscCode || null,
    branchName: payload?.branchName || null,
    remarks: payload?.remarks || null,
    ...(includeOpeningBalance ? { openingBalance: Number(payload?.openingBalance || 0) } : {}),
    categoryIds: Array.isArray(payload?.categoryIds)
      ? payload.categoryIds.map(value => Number(value)).filter(Number.isFinite)
      : []
  };
}

function normalizeBankDepositPayload(payload) {
  return {
    paymentMethodId: Number(payload?.paymentMethodId),
    bankAccountId: Number(payload?.bankAccountId),
    amount: Number(payload?.amount),
    depositDate: payload?.depositDate || null,
    depositReferenceNo: payload?.depositReferenceNo || null,
    remarks: payload?.remarks || null
  };
}

export const accountsApi = {
  // Published payment configuration APIs.
  getPaymentCategories(jamaatId) {
    return liveApiRequest(
      withOptionalJamaat(liveEndpoints.accounts.paymentCategories, jamaatId)
    );
  },
  getPaymentCategory(categoryId) {
    return liveApiRequest(liveEndpoints.accounts.paymentCategoryById(categoryId));
  },
  createPaymentCategory(payload) {
    const body =
      payload && typeof payload === "object"
        ? {
            jamaatId: Number(payload.jamaatId),
            name: String(payload.name || "").trim()
          }
        : { name: String(payload || "").trim() };
    return liveApiRequest(liveEndpoints.accounts.paymentCategories, {
      method: "POST",
      body
    });
  },
  updatePaymentCategory(categoryId, payload) {
    return liveApiRequest(liveEndpoints.accounts.paymentCategoryById(categoryId), {
      method: "PUT",
      body: { name: payload.name, isActive: Boolean(payload.isActive) }
    });
  },
  deletePaymentCategory(categoryId) {
    return liveApiRequest(liveEndpoints.accounts.paymentCategoryById(categoryId), {
      method: "DELETE"
    });
  },

  getPaymentSubCategories(jamaatId) {
    return liveApiRequest(
      withOptionalJamaat(liveEndpoints.accounts.paymentSubCategories, jamaatId)
    );
  },
  getPaymentSubCategoriesByCategory(categoryId) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentSubCategoriesByCategory(categoryId)
    );
  },
  getPaymentSubCategory(subCategoryId) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentSubCategoryById(subCategoryId)
    );
  },
  createPaymentSubCategory(categoryId, name) {
    return liveApiRequest(liveEndpoints.accounts.paymentSubCategories, {
      method: "POST",
      body: { categoryId: Number(categoryId), name }
    });
  },
  updatePaymentSubCategory(subCategoryId, payload) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentSubCategoryById(subCategoryId),
      {
        method: "PUT",
        body: {
          categoryId: Number(payload.categoryId),
          name: payload.name,
          isActive: Boolean(payload.isActive)
        }
      }
    );
  },
  deletePaymentSubCategory(subCategoryId) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentSubCategoryById(subCategoryId),
      { method: "DELETE" }
    );
  },

  getPaymentFields(jamaatId) {
    return liveApiRequest(
      withOptionalJamaat(liveEndpoints.accounts.paymentFields, jamaatId)
    );
  },
  getPaymentFieldsBySubCategory(subCategoryId) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentFieldsBySubCategory(subCategoryId)
    );
  },
  getPaymentField(fieldId) {
    return liveApiRequest(liveEndpoints.accounts.paymentFieldById(fieldId));
  },
  createPaymentField(payload) {
    return liveApiRequest(liveEndpoints.accounts.paymentFields, {
      method: "POST",
      body: {
        subCategoryId: Number(payload.subCategoryId),
        fieldName: payload.fieldName,
        fieldKey: payload.fieldKey,
        fieldType: payload.fieldType,
        isRequired: Boolean(payload.isRequired),
        displayOrder: Number(payload.displayOrder || 0)
      }
    });
  },
  updatePaymentField(fieldId, payload) {
    return liveApiRequest(liveEndpoints.accounts.paymentFieldById(fieldId), {
      method: "PUT",
      body: {
        subCategoryId: Number(payload.subCategoryId),
        fieldName: payload.fieldName,
        fieldKey: payload.fieldKey,
        fieldType: payload.fieldType,
        isRequired: Boolean(payload.isRequired),
        displayOrder: Number(payload.displayOrder || 0),
        isActive: Boolean(payload.isActive)
      }
    });
  },
  deletePaymentField(fieldId) {
    return liveApiRequest(liveEndpoints.accounts.paymentFieldById(fieldId), {
      method: "DELETE"
    });
  },

  getPaymentMethods() {
    return liveApiRequest(liveEndpoints.accounts.paymentMethods);
  },
  getPaymentMethod(paymentMethodId) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentMethodById(paymentMethodId)
    );
  },
  createPaymentMethod(name) {
    return liveApiRequest(liveEndpoints.accounts.paymentMethods, {
      method: "POST",
      body: { name }
    });
  },
  updatePaymentMethod(paymentMethodId, payload) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentMethodById(paymentMethodId),
      {
        method: "PUT",
        body: { name: payload.name, isActive: Boolean(payload.isActive) }
      }
    );
  },
  deletePaymentMethod(paymentMethodId) {
    return liveApiRequest(
      liveEndpoints.accounts.paymentMethodById(paymentMethodId),
      { method: "DELETE" }
    );
  },

  getPayments(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.pagedPayments(filters));
  },
  getPayment(paymentId) {
    return liveApiRequest(liveEndpoints.accounts.paymentById(paymentId));
  },
  createPayment(payload) {
    return liveApiRequest(liveEndpoints.accounts.payments, {
      method: "POST",
      body: normalizePaymentPayload(payload, true)
    });
  },
  updatePayment(paymentId, payload) {
    return liveApiRequest(liveEndpoints.accounts.paymentById(paymentId), {
      method: "PUT",
      body: normalizePaymentPayload(payload, false)
    });
  },
  refundPayment(paymentId) {
    return liveApiRequest(liveEndpoints.accounts.refundPayment(paymentId), {
      method: "PUT"
    });
  },
  getPaymentLogs(paymentId) {
    return liveApiRequest(liveEndpoints.accounts.paymentLogs(paymentId));
  },
  getMuminLedger(muminId, pageNumber = 1, pageSize = 20) {
    return liveApiRequest(
      liveEndpoints.accounts.muminLedger(muminId, pageNumber, pageSize)
    );
  },

  // Published Day Book APIs.
  getDaybook(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.pagedDaybook(filters));
  },
  getDaybookEntry(dayBookId) {
    return liveApiRequest(liveEndpoints.accounts.daybookById(dayBookId));
  },
  createDaybookEntry(payload) {
    return liveApiRequest(liveEndpoints.accounts.daybook, {
      method: "POST",
      body: normalizeDayBookPayload(payload)
    });
  },
  updateDaybookEntry(dayBookId, payload) {
    return liveApiRequest(liveEndpoints.accounts.daybookById(dayBookId), {
      method: "PUT",
      body: normalizeDayBookPayload(payload)
    });
  },
  deleteDaybookEntry(dayBookId) {
    return liveApiRequest(liveEndpoints.accounts.daybookById(dayBookId), {
      method: "DELETE"
    });
  },
  refundDaybookEntry(dayBookId) {
    return liveApiRequest(liveEndpoints.accounts.refundDaybook(dayBookId), {
      method: "PUT"
    });
  },
  getDaybookLogs(dayBookId) {
    return liveApiRequest(liveEndpoints.accounts.daybookLogs(dayBookId));
  },

  // Published bank account, deposit and summary APIs.
  getBankAccounts() {
    return liveApiRequest(liveEndpoints.accounts.bankAccounts);
  },
  getBankAccount(bankAccountId) {
    return liveApiRequest(liveEndpoints.accounts.bankAccountById(bankAccountId));
  },
  createBankAccount(payload) {
    return liveApiRequest(liveEndpoints.accounts.bankAccounts, {
      method: "POST",
      body: normalizeBankAccountPayload(payload, true)
    });
  },
  updateBankAccount(bankAccountId, payload) {
    return liveApiRequest(liveEndpoints.accounts.bankAccountById(bankAccountId), {
      method: "PUT",
      body: normalizeBankAccountPayload(payload, false)
    });
  },
  deleteBankAccount(bankAccountId) {
    return liveApiRequest(liveEndpoints.accounts.bankAccountById(bankAccountId), {
      method: "DELETE"
    });
  },

  getBankDeposits(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.pagedDeposits(filters));
  },
  getBankDeposit(bankDepositId) {
    return liveApiRequest(liveEndpoints.accounts.depositById(bankDepositId));
  },
  createBankDeposit(payload) {
    return liveApiRequest(liveEndpoints.accounts.deposits, {
      method: "POST",
      body: normalizeBankDepositPayload(payload)
    });
  },
  updateBankDeposit(bankDepositId, payload) {
    return liveApiRequest(liveEndpoints.accounts.depositById(bankDepositId), {
      method: "PUT",
      body: normalizeBankDepositPayload(payload)
    });
  },
  deleteBankDeposit(bankDepositId) {
    return liveApiRequest(liveEndpoints.accounts.depositById(bankDepositId), {
      method: "DELETE"
    });
  },
  getBankDepositLogs(bankDepositId) {
    return liveApiRequest(liveEndpoints.accounts.depositLogs(bankDepositId));
  },
  getCashSummary(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.cashSummary(filters));
  },
  getAccountsSummary(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.summary(filters));
  },
  getCollectionSummary(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.collectionSummary(filters));
  },
  // Compatibility alias for callers from the previous collection-summary implementation.
  getMyCollectionSummary(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.collectionSummary(filters));
  },

  // Legacy aliases retained for older callers.
  getSummary(filters = {}) {
    return liveApiRequest(liveEndpoints.accounts.summary(filters));
  },
  getMyPayments() {
    return apiRequest(endpoints.myPayments);
  },
  getReceipt(paymentId) {
    return apiRequest(endpoints.paymentReceipt(paymentId));
  },
  getLedgers() {
    return apiRequest(endpoints.ledgers);
  },
  getUserLedger(muminId, pageNumber = 1, pageSize = 20) {
    return liveApiRequest(
      liveEndpoints.accounts.muminLedger(muminId, pageNumber, pageSize)
    );
  }
};
