function cashTransferPayload(form, account) {
  const fromUserId = Number(form.fromUserId), toUserId = Number(form.toUserId);
  if (!fromUserId || !toUserId || fromUserId === toUserId) throw new Error("Select different sender and receiver accounts.");
  if (!account || String(account.bankAccountId) !== String(form.bankAccountId)) throw new Error("Select a bank account from the sender’s holdings.");
  if (!(account.eligibleReceivers || []).some(item => Number(item.userId) === toUserId)) throw new Error("Select an eligible active committee member for this bank account.");
  const cashAmount = Number(form.cashAmount || 0);
  if (!Number.isFinite(cashAmount) || cashAmount < 0 || Math.abs(cashAmount * 100 - Math.round(cashAmount * 100)) > 0.000001) throw new Error("Enter a cash amount with at most two decimal places.");
  if (Math.round(cashAmount * 100) > Math.round(Number(account.pendingCash || 0) * 100)) throw new Error("Cash amount exceeds the sender’s available holdings.");
  const chequeIds = (form.chequeIds || []).map(Number);
  if (new Set(chequeIds).size !== chequeIds.length || chequeIds.some(id => !(account.cheques || []).some(item => Number(item.chequeId) === id))) throw new Error("Select only cheques currently held by the sender on this bank account.");
  if (!cashAmount && !chequeIds.length) throw new Error("Enter cash or select at least one cheque to transfer.");
  const remarks = String(form.remarks || "").trim();
  if (remarks.length > 500) throw new Error("Remarks must be 500 characters or fewer.");
  return { fromUserId, toUserId, bankAccountId: Number(account.bankAccountId), cashAmount, chequeIds, remarks: remarks || null };
}
module.exports = { cashTransferPayload };
