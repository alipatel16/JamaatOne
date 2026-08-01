import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

const json = body => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

export const accountsApi = {
  getSummary() {
    return apiRequest(endpoints.accountsSummary);
  },

  getPayments() {
    return apiRequest(endpoints.payments);
  },

  getMyPayments() {
    return apiRequest(endpoints.myPayments);
  },

  createPayment(payload) {
    return apiRequest(endpoints.payments, {
      method: "POST",
      ...json(payload)
    });
  },

  updatePayment(paymentId, payload) {
    return apiRequest(endpoints.paymentById(paymentId), {
      method: "PUT",
      ...json(payload)
    });
  },

  deletePayment(paymentId) {
    return apiRequest(endpoints.paymentById(paymentId), {
      method: "DELETE"
    });
  },

  getReceipt(paymentId) {
    return apiRequest(endpoints.paymentReceipt(paymentId));
  },

  getDaybook() {
    return apiRequest(endpoints.daybook);
  },

  createDaybookEntry(payload) {
    return apiRequest(endpoints.daybook, {
      method: "POST",
      ...json(payload)
    });
  },

  deleteDaybookEntry(entryId) {
    return apiRequest(endpoints.daybookEntryById(entryId), {
      method: "DELETE"
    });
  },

  getLedgers() {
    return apiRequest(endpoints.ledgers);
  },

  getUserLedger(userId) {
    return apiRequest(endpoints.userLedger(userId));
  },

  getBankDeposits() {
    return apiRequest(endpoints.bankDeposits);
  },

  createBankDeposit(payload) {
    return apiRequest(endpoints.bankDeposits, {
      method: "POST",
      ...json(payload)
    });
  },

  deleteBankDeposit(depositId) {
    return apiRequest(endpoints.bankDepositById(depositId), {
      method: "DELETE"
    });
  },

  getUsers() {
    return apiRequest(endpoints.users);
  },

  getFamilyMembers(userId) {
    return apiRequest(endpoints.familyMembers(userId));
  }
};
