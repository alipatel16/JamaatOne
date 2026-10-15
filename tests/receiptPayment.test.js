const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isChequeReceiptLine,
  chequeNumberForReceiptLine,
  validateReceiptChequeNumbers
} = require("../src/utils/receiptPayment");

const paymentMethods = [
  { paymentMethodId: 1, paymentMethodName: "Cash" },
  { paymentMethodId: 2, paymentMethodName: "UPI" },
  { paymentMethodId: 3, paymentMethodName: "Bank CHEQUE payment" }
];

test("recognizes a receipt cheque only when both ID 3 and the Cheque name match", () => {
  assert.equal(
    isChequeReceiptLine({ paymentMethodId: 3 }, paymentMethods),
    true
  );
  assert.equal(
    isChequeReceiptLine(
      { paymentMethodId: 3 },
      [{ paymentMethodId: 3, paymentMethodName: "Cash" }]
    ),
    false
  );
  assert.equal(
    isChequeReceiptLine(
      { paymentMethodId: 2 },
      [{ paymentMethodId: 2, paymentMethodName: "Cheque" }]
    ),
    false
  );
});

test("copies a cheque receipt reference into chequeNo", () => {
  assert.equal(
    chequeNumberForReceiptLine(
      { paymentMethodId: 3, paymentReference: " 6797879 " },
      paymentMethods
    ),
    "6797879"
  );
  assert.equal(
    chequeNumberForReceiptLine(
      { paymentMethodId: 2, paymentReference: "858689" },
      paymentMethods
    ),
    null
  );
});

test("requires a cheque number only for a confirmed cheque receipt line", () => {
  assert.equal(
    validateReceiptChequeNumbers(
      [{ paymentMethodId: 3, paymentReference: "" }],
      paymentMethods
    ),
    "Enter a cheque number for split payment 1."
  );
  assert.equal(
    validateReceiptChequeNumbers(
      [{ paymentMethodId: 3, paymentReference: "" }],
      [{ paymentMethodId: 3, paymentMethodName: "Cash" }]
    ),
    ""
  );
});
