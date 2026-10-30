const test = require("node:test");
const assert = require("node:assert/strict");
const { cashTransferPayload } = require("../src/utils/cashTransfer");
const account = { bankAccountId: 7, pendingCash: 1500, eligibleReceivers: [{ userId: 9 }], cheques: [{ chequeId: 20, amount: 4000 }] };
const form = { fromUserId: "4", toUserId: "9", bankAccountId: "7", cashAmount: "500.25", chequeIds: ["20"], remarks: " Handover " };
test("cash transfers use only the selected bank's holdings and preserve whole cheques", () => {
  assert.deepEqual(cashTransferPayload(form, account), { fromUserId: 4, toUserId: 9, bankAccountId: 7, cashAmount: 500.25, chequeIds: [20], remarks: "Handover" });
  assert.equal(cashTransferPayload({ ...form, cashAmount: "", chequeIds: [20] }, account).cashAmount, 0);
});
test("rejects overdraws, invalid precision, foreign cheques, ineligible receivers and empty transfers", () => {
  for (const changes of [
    { cashAmount: "1500.01" }, { cashAmount: "-1" }, { cashAmount: "0.001" },
    { chequeIds: [21] }, { chequeIds: [20, 20] }, { toUserId: "4" }, { toUserId: "8" },
    { bankAccountId: "8" }, { cashAmount: "", chequeIds: [] }
  ]) assert.throws(() => cashTransferPayload({ ...form, ...changes }, account));
});
