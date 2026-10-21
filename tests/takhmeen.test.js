const test = require("node:test");
const assert = require("node:assert/strict");
const { isFmbCategory, fmbCategoriesForUser, validateTakhmeen } = require("../src/utils/takhmeen");
const categories = [
  { categoryId: 1, categoryName: "FMB" },
  { categoryId: 2, categoryName: "Madrasa" },
  { categoryId: 3, categoryName: "FMB", isActive: false }
];
test("FMB matching uses category text and excludes inactive and other categories", () => {
  assert.equal(isFmbCategory({ categoryName: " fmb " }), true);
  assert.equal(isFmbCategory(categories[1]), false);
  assert.equal(isFmbCategory(categories[2]), false);
});
test("committee access requires an assigned FMB category and ordinary members are excluded", () => {
  assert.deepEqual(fmbCategoriesForUser({ role: "COMMITTEE_MEMBER" }, categories, [{ categoryId: 2 }]), []);
  assert.deepEqual(fmbCategoriesForUser({ role: "COMMITTEE_MEMBER" }, categories, [{ categoryId: "1" }]), [categories[0]]);
  assert.deepEqual(fmbCategoriesForUser({ role: "USER" }, categories, [{ categoryId: 1 }]), []);
  assert.deepEqual(fmbCategoriesForUser({ role: "FMB_USER" }, categories), []);
  assert.deepEqual(fmbCategoriesForUser({ role: "FMB_USER" }, categories, [{ categoryId: 1 }]), [categories[0]]);
  assert.deepEqual(fmbCategoriesForUser({ role: "AAMIL" }, categories), [categories[0]]);
});
test("validates pledge dates, linked bank and amount already paid", () => {
  const form = { muminId: "1", categoryId: "1", bankAccountId: "4", niyatAmount: "40000", fromDate: "2026-10-21", toDate: "2027-10-20" };
  assert.equal(validateTakhmeen(form, [categories[0]], [{ bankAccountId: 4 }]), "");
  assert.notEqual(validateTakhmeen({ ...form, toDate: "2026-01-01" }, [categories[0]], [{ bankAccountId: 4 }]), "");
  assert.notEqual(validateTakhmeen(form, [categories[0]], [], 0), "");
  assert.notEqual(validateTakhmeen(form, [categories[0]], [{ bankAccountId: 4 }], 45000), "");
});
