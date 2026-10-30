function personalPaymentFilters(muminId, filters = {}) {
  const id = Number(muminId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Your Mumineen record is required to load personal payment history.");
  return { ...filters, muminId: id };
}
async function resolvePersonalMumin(user, api) {
  const itsNo = String(user?.itsNo || user?.itsId || "").trim();
  if (!itsNo) throw new Error("Your login ITS number is required to find your payment history.");
  const result = await api.getPaged(1, 20, itsNo);
  const matches = (result?.items || []).filter(item => String(item.itsId || "").trim() === itsNo);
  if (matches.length !== 1) throw new Error("Unable to identify a unique Mumineen record for your ITS number. Contact your Aamil.");
  return personalPaymentFilters(matches[0].muminId).muminId;
}
module.exports = { resolvePersonalMumin, personalPaymentFilters };
