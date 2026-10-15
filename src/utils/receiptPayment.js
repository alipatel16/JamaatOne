const CHEQUE_PAYMENT_METHOD_ID = 3;

function isChequeReceiptLine(line, paymentMethods) {
  if (Number(line?.paymentMethodId) !== CHEQUE_PAYMENT_METHOD_ID) return false;

  const method = (Array.isArray(paymentMethods) ? paymentMethods : []).find(
    item => String(item?.paymentMethodId) === String(line?.paymentMethodId)
  );
  const methodName = String(method?.paymentMethodName || "").trim().toLowerCase();
  return methodName.includes("cheque");
}

function chequeNumberForReceiptLine(line, paymentMethods) {
  if (!isChequeReceiptLine(line, paymentMethods)) return null;
  return String(line?.paymentReference || "").trim() || null;
}

function validateReceiptChequeNumbers(lines, paymentMethods) {
  const items = Array.isArray(lines) ? lines : [];
  for (let index = 0; index < items.length; index += 1) {
    if (
      isChequeReceiptLine(items[index], paymentMethods) &&
      !String(items[index]?.paymentReference || "").trim()
    ) {
      return `Enter a cheque number for split payment ${index + 1}.`;
    }
  }
  return "";
}

module.exports = {
  isChequeReceiptLine,
  chequeNumberForReceiptLine,
  validateReceiptChequeNumbers
};
