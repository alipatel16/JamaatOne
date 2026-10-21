function isFmbCategory(category) {
  return category?.isActive !== false && /\bfmb\b/i.test(String(category?.categoryName || ""));
}

function fmbCategoriesForUser(user, categories, assignedCategories = []) {
  const role = String(user?.role || user?.roleName || "").toUpperCase().replace(/[\s-]+/g, "_");
  const fmb = categories.filter(isFmbCategory);
  if (["AAMIL", "AMIL", "ADMIN"].includes(role)) return fmb;
  if (!["COMMITTEE_MEMBER", "COMMITTEEMEMBER", "FMB_USER", "FMBUSER", "FMB"].includes(role)) return [];
  return fmb.filter(category => assignedCategories.some(item =>
    String(item.categoryId) === String(category.categoryId)));
}

function validateTakhmeen(form, categories, banks, paidAmount = 0) {
  if (!form.muminId) return "Select a Mumin.";
  if (!categories.some(item => String(item.categoryId) === String(form.categoryId))) return "Select an accessible FMB category.";
  if (!banks.some(item => String(item.bankAccountId) === String(form.bankAccountId))) return "Select a bank account tagged with this category.";
  const amount = Number(form.niyatAmount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid niyat amount.";
  if (amount < Number(paidAmount)) return "Niyat amount cannot be less than the amount already paid.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(form.toDate)) return "Select both period dates.";
  if (form.toDate < form.fromDate) return "To date cannot be before from date.";
  if (String(form.remarks || "").trim().length > 500) return "Remarks must be 500 characters or fewer.";
  return "";
}

module.exports = { isFmbCategory, fmbCategoriesForUser, validateTakhmeen };
