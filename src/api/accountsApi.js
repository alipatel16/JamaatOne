import { apiRequest, liveApiRequest } from "./client";
import { endpoints, liveEndpoints } from "./endpoints";


function normalizeDayBookPayload(payload) {
  return {
    entryType: payload?.entryType || null,
    paymentFor: payload?.paymentFor || null,
    amount: Number(payload?.amount),
    paymentMethodId: Number(payload?.paymentMethodId),
    paymentReferenceNo: payload?.paymentReferenceNo || null,
    remarks: payload?.remarks || null
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
    subCategoryId: Number(payload?.subCategoryId || 0),
    amount: Number(payload?.amount),
    paymentMethodId: Number(payload?.paymentMethodId),
    paymentReference: payload?.paymentReference || null,
    remarks: payload?.remarks || null,
    fieldValues
  };
}

function normalizeBankAccountPayload(payload) {
  return {
    bankAccountName: payload?.bankAccountName || null,
    bankName: payload?.bankName || null,
    bankAccountNumber: payload?.bankAccountNumber || null,
    accountHolderName: payload?.accountHolderName || null,
    ifscCode: payload?.ifscCode || null,
    branchName: payload?.branchName || null,
    remarks: payload?.remarks || null
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
  getPaymentCategories() {
    return liveApiRequest(liveEndpoints.accounts.paymentCategories);
  },
  getPaymentCategory(categoryId) {
    return liveApiRequest(liveEndpoints.accounts.paymentCategoryById(categoryId));
  },
  createPaymentCategory(name) {
    return liveApiRequest(liveEndpoints.accounts.paymentCategories, {
      method: "POST",
      body: { name }
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

  getPaymentSubCategories() {
    return liveApiRequest(liveEndpoints.accounts.paymentSubCategories);
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

  getPaymentFields() {
    return liveApiRequest(liveEndpoints.accounts.paymentFields);
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
      body: normalizeBankAccountPayload(payload)
    });
  },
  updateBankAccount(bankAccountId, payload) {
    return liveApiRequest(liveEndpoints.accounts.bankAccountById(bankAccountId), {
      method: "PUT",
      body: normalizeBankAccountPayload(payload)
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
