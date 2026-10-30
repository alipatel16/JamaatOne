const test = require("node:test");
const assert = require("node:assert/strict");
const { resolvePersonalMumin, personalPaymentFilters } = require("../src/utils/personalPayments");

test("personal history resolves exact login ITS and never treats userId as muminId", async () => {
  let searched;
  const api = { getPaged: async (page, size, search) => { searched = search; return { items: [{ muminId: 999, itsId: "12345677" }, { muminId: 534, itsId: "12345678" }] }; } };
  assert.equal(await resolvePersonalMumin({ userId: 4, itsNo: "12345678" }, api), 534);
  assert.equal(searched, "12345678");
  assert.deepEqual(personalPaymentFilters(534, { muminId: 999, fromDate: "2026-10-01" }), { muminId: 534, fromDate: "2026-10-01" });
});
test("missing or ambiguous identity blocks unscoped personal payment requests", async () => {
  await assert.rejects(resolvePersonalMumin({ userId: 4 }, {}), /ITS/i);
  await assert.rejects(resolvePersonalMumin({ itsNo: "12345678" }, { getPaged: async () => ({ items: [] }) }), /Mumineen/i);
  await assert.rejects(resolvePersonalMumin({ itsNo: "12345678" }, { getPaged: async () => ({ items: [{ muminId: 1, itsId: "12345678" }, { muminId: 2, itsId: "12345678" }] }) }), /Mumineen/i);
  for (const id of [null, "", 0, -1, "invalid"]) assert.throws(() => personalPaymentFilters(id, {}), /Mumineen/i);
});
