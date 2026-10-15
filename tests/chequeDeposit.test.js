const test = require("node:test");
const assert = require("node:assert/strict");
const { selectedChequeDeposit } = require("../src/utils/chequeDeposit");

test("calculates a cheque deposit from selected IDs without trusting typed amounts", () => {
  const result = selectedChequeDeposit(["10", "11"], [
    { chequeId: 10, amount: 5000.10 },
    { chequeId: 11, amount: 2500.20 },
    { chequeId: 12, amount: 9000 }
  ]);
  assert.deepEqual(result, { chequeIds: [10, 11], amount: 7500.30 });
});

test("rejects empty, stale, duplicate and invalid cheque selections", () => {
  assert.throws(() => selectedChequeDeposit([], []));
  assert.throws(() => selectedChequeDeposit([10], []));
  assert.throws(() => selectedChequeDeposit([10, "10"], [{ chequeId: 10, amount: 10 }]));
  assert.throws(() => selectedChequeDeposit([10], [{ chequeId: 10, amount: -10 }]));
});
