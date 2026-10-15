function selectedChequeDeposit(ids, cheques) {
  const chequeIds = ids.map(Number);
  if (!chequeIds.length) throw new Error("Select at least one undeposited cheque.");
  if (new Set(chequeIds).size !== chequeIds.length) throw new Error("A cheque can only be selected once.");
  let paise = 0;
  for (const id of chequeIds) {
    const cheque = cheques.find(item => Number(item.chequeId) === id);
    if (!cheque || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error("The cheque selection has changed. Refresh and select the cheques again.");
    }
    const amount = Number(cheque.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("A selected cheque has an invalid amount.");
    paise += Math.round(amount * 100);
  }
  return { chequeIds, amount: paise / 100 };
}

module.exports = { selectedChequeDeposit };
