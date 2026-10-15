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
