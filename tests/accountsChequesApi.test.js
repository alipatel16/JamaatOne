const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

// Run the real API builders, replacing only the authenticated network transport.
function loadModule(file, dependencies = {}) {
  const module = { exports: {} };
  const { code } = babel.transformFileSync(path.join(__dirname, "..", file), {
    configFile: false, babelrc: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"]
  });
  vm.runInNewContext(code, {
    module, exports: module.exports, URLSearchParams,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    }
  });
  return module.exports;
}

const endpoints = loadModule("src/api/endpoints.js");
const { accountsApi } = loadModule("src/api/accountsApi.js", {
  "./endpoints": endpoints,
  "./client": { liveApiRequest: (url, options) => ({ url, ...options }) }
});

test("requests the selected bank and holder's paginated cheque list without guessing a status", () => {
  const request = accountsApi.getCheques({ bankAccountId: 9, mine: true, pageNumber: 2 });
  const url = new URL(request.url, "https://example.test");
  assert.equal(url.pathname, "/api/Accounts/cheques");
  assert.equal(url.searchParams.get("pageNumber"), "2");
  assert.equal(url.searchParams.get("pageSize"), "20");
  assert.equal(url.searchParams.get("bankAccountId"), "9");
  assert.equal(url.searchParams.get("mine"), "true");
  assert.equal(url.searchParams.has("status"), false);
});

test("sends selected cheque IDs and their total to the deposits POST endpoint", () => {
  const request = accountsApi.createBankDeposit({
    paymentMethodId: "3", bankAccountId: "9", amount: 7500.3,
    chequeIds: ["10", "11"], depositDate: "2026-10-15T00:00:00"
  });
  assert.equal(request.url, "/api/Accounts/deposits");
  assert.equal(request.method, "POST");
  assert.deepEqual(JSON.parse(JSON.stringify(request.body)), {
    paymentMethodId: 3, bankAccountId: 9, amount: 7500.3,
    chequeIds: [10, 11], depositDate: "2026-10-15T00:00:00",
    depositReferenceNo: null, remarks: null
  });
});

test("preserves the existing cash deposit and edit request bodies", () => {
  const payload = { paymentMethodId: "1", bankAccountId: "9", amount: "500" };
  for (const request of [accountsApi.createBankDeposit(payload), accountsApi.updateBankDeposit(4, payload)]) {
    assert.equal(request.body.amount, 500);
    assert.equal(request.body.paymentMethodId, 1);
    assert.equal(Object.hasOwn(request.body, "chequeIds"), false);
  }
});

test("creates and updates takhmeen using only fields permitted by each contract", () => {
  const payload = { muminId: "534", categoryId: "1", bankAccountId: "4", fromDate: "2026-10-21T12:00:00.000Z", toDate: "2027-10-20T12:00:00.000Z", niyatAmount: "40000", remarks: " Niyat " };
  const created = accountsApi.createTakhmeen(payload);
  assert.equal(created.url, "/api/Accounts/takhmeen");
  assert.equal(created.method, "POST");
  assert.equal(created.body.muminId, 534);
  assert.equal(created.body.categoryId, 1);
  assert.equal(created.body.niyatAmount, 40000);
  assert.equal(created.body.bankAccountId, 4);
  assert.equal(created.body.remarks, "Niyat");
  const updated = accountsApi.updateTakhmeen(9, payload);
  assert.equal(updated.url, "/api/Accounts/takhmeen/9");
  assert.equal(updated.method, "PUT");
  assert.equal(Object.hasOwn(updated.body, "muminId"), false);
  assert.equal(Object.hasOwn(updated.body, "categoryId"), false);
});

test("lists, fetches details with embedded history and deletes takhmeen", () => {
  const request = accountsApi.getTakhmeen({ pageNumber: 2, categoryId: 1, hasRemaining: false, search: "Test Mumin" });
  const url = new URL(request.url, "https://example.test");
  assert.equal(url.pathname, "/api/Accounts/takhmeen");
  assert.equal(url.searchParams.get("pageNumber"), "2");
  assert.equal(url.searchParams.get("categoryId"), "1");
  assert.equal(url.searchParams.get("hasRemaining"), "false");
  assert.equal(accountsApi.getTakhmeenById(9).url, "/api/Accounts/takhmeen/9");
  assert.equal(accountsApi.deleteTakhmeen(9).method, "DELETE");
});

test("includes considerTakhmeen on payment and receipt creation while preserving payment edits", () => {
  const payload = { muminId: 534, categoryId: 1, bankAccountId: 4, paymentMethodId: 1, amount: 500, considerTakhmeen: true, lines: [{ paymentMethodId: 1, amount: 500 }] };
  assert.equal(accountsApi.createPayment(payload).body.considerTakhmeen, true);
  assert.equal(accountsApi.createReceipt(payload).body.considerTakhmeen, true);
  assert.equal(accountsApi.createPayment({ ...payload, considerTakhmeen: false }).body.considerTakhmeen, false);
  assert.equal(accountsApi.createReceipt({ ...payload, considerTakhmeen: false }).body.considerTakhmeen, false);
  assert.equal(Object.hasOwn(accountsApi.updatePayment(9, payload).body, "considerTakhmeen"), false);
});
