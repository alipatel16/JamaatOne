const escapeHtml = value =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const label = value =>
  escapeHtml(String(value || "-").replaceAll("_", " "));

const formatAmount = value =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const row = (key, value) => `
  <div class="row">
    <div class="cell key">${escapeHtml(key)}</div>
    <div class="cell value">${escapeHtml(value || "-")}</div>
  </div>`;

export const receiptHtml = r => {
  const documentType = String(r.documentType || "RECEIPT").toUpperCase();
  const isVoucher = documentType === "VOUCHER";
  const isDayBook = Boolean(r.isDayBook);
  const subtype = r.subType || r.lagatType;
  const paymentDescription =
    r.paymentFor === "OTHERS"
      ? r.otherDescription
      : subtype
        ? `${String(r.paymentFor || "-").replaceAll("_", " ")} · ${String(subtype).replaceAll("_", " ")}`
        : String(r.paymentFor || "-").replaceAll("_", " ");

  const detailSections = isDayBook
    ? `
      <div class="section-title">DAY BOOK DETAILS</div>
      <div class="grid">
        ${row("Entry type", r.entryType)}
        ${row("Category", r.paymentFor)}
        ${row("Payment method", r.paymentMethod)}
        ${row("Bank account", r.bankAccountName)}
        ${row("Reference", r.referenceNumber)}
        ${row("Notes", r.notes)}
      </div>`
    : `
      <div class="section-title">MEMBER DETAILS</div>
      <div class="grid">
        ${row("Paid by", r.userName)}
        ${row("ITS ID / Grade", `${r.itsId || "-"} / ${r.userGrade || "-"}`)}
        ${r.paidForUserName ? row(
          "Madrasa fee paid for",
          `${r.paidForUserName}${r.paidForItsId ? ` · ITS ${r.paidForItsId}` : ""}`
        ) : ""}
      </div>

      <div class="section-title">PAYMENT DETAILS</div>
      <div class="grid">
        ${row("Payment for", paymentDescription)}
        ${row(
          "Payment method",
          `${String(r.paymentMethod || "-").replaceAll("_", " ")}${r.referenceNumber ? ` · ${r.referenceNumber}` : ""}`
        )}
        ${row("Bank account", r.bankAccountName)}
        ${row("Notes", r.notes)}
      </div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #25312D;
      font-family: "Mozilla Text", Arial, sans-serif;
      background: #F3F5F3;
    }
    .sheet {
      min-height: 267mm;
      background: #FFFFFF;
      border: 1px solid #DDE5E0;
      border-radius: 22px;
      overflow: hidden;
      position: relative;
    }
    .header {
      padding: 30px 34px 26px;
      background: linear-gradient(135deg, #344B43 0%, #526A61 100%);
      color: #FFFFFF;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-kicker {
      color: #E7D3AB;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .brand {
      margin-top: 6px;
      font-size: 27px;
      font-weight: 700;
    }
    .address {
      margin-top: 6px;
      color: #D8E2DE;
      font-size: 12px;
    }
    .receipt-box {
      text-align: right;
      border: 1px solid rgba(255,255,255,.25);
      border-radius: 14px;
      padding: 12px 15px;
      min-width: 190px;
      background: rgba(255,255,255,.08);
    }
    .receipt-label {
      color: #D8E2DE;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.3px;
    }
    .receipt-number {
      margin-top: 5px;
      font-size: 18px;
      font-weight: 700;
    }
    .receipt-date {
      margin-top: 5px;
      color: #E7D3AB;
      font-size: 12px;
    }
    .content { padding: 28px 34px 34px; }
    .status {
      display: inline-block;
      padding: 7px 12px;
      border-radius: 999px;
      background: ${isVoucher ? "#F7F0E5" : "#EAF4ED"};
      color: ${isVoucher ? "#7A6A52" : "#52715E"};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .5px;
    }
    .amount-panel {
      margin: 24px 0;
      border-radius: 18px;
      background: #F7F0E5;
      padding: 22px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-caption {
      color: #7A6A52;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .amount {
      color: #344B43;
      font-size: 30px;
      font-weight: 700;
      text-align: right;
    }
    .words {
      color: #6E6A62;
      font-size: 12px;
      margin-top: 4px;
      text-align: right;
    }
    .section-title {
      margin: 22px 0 8px;
      color: #7A8580;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
    }
    .grid {
      border: 1px solid #E3E8E5;
      border-radius: 16px;
      overflow: hidden;
    }
    .row {
      display: flex;
      border-bottom: 1px solid #E9EDEA;
    }
    .row:last-child { border-bottom: 0; }
    .cell { padding: 12px 14px; min-height: 42px; }
    .key {
      width: 34%;
      background: #FAFBFA;
      color: #7A8580;
      font-size: 11px;
      font-weight: 600;
    }
    .value {
      width: 66%;
      color: #25312D;
      font-size: 12px;
      font-weight: 600;
    }
    .recorder {
      margin-top: 24px;
      padding: 16px;
      background: #ECF1F5;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
    }
    .recorder-label {
      color: #637486;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .recorder-value { margin-top: 5px; font-weight: 700; font-size: 12px; }
    .signature {
      width: 190px;
      margin-left: auto;
      margin-top: 58px;
      border-top: 1px solid #7A8580;
      text-align: center;
      padding-top: 8px;
      color: #7A8580;
      font-size: 11px;
    }
    .footer {
      margin-top: 42px;
      border-top: 1px solid #E3E8E5;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      color: #8A948F;
      font-size: 9px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand-kicker">OFFICIAL PAYMENT ${documentType}</div>
        <div class="brand">Dawoodi Bohra Jamaat</div>
        <div class="address">${escapeHtml(r.jamaatName || "JamaatOne")}</div>
      </div>
      <div class="receipt-box">
        <div class="receipt-label">${documentType} NUMBER</div>
        <div class="receipt-number">${escapeHtml(r.receiptNumber || "-")}</div>
        <div class="receipt-date">${escapeHtml(r.paymentDate || "-")}</div>
      </div>
    </div>

    <div class="content">
      <span class="status">${isVoucher ? "PAYMENT VOUCHER" : "PAYMENT RECEIVED"}</span>

      <div class="amount-panel">
        <div>
          <div class="amount-caption">${isVoucher ? "AMOUNT PAID" : "AMOUNT RECEIVED"}</div>
          <div style="margin-top:8px;color:#7A6A52;font-size:12px;">${escapeHtml(paymentDescription)}</div>
        </div>
        <div>
          <div class="amount">₹${formatAmount(r.amount)}</div>
          <div class="words">${escapeHtml(r.amountInWords || "")}</div>
        </div>
      </div>

      ${detailSections}

      <div class="recorder">
        <div>
          <div class="recorder-label">${isDayBook ? "ENTRY RECORDED BY" : "PAYMENT RECORDED BY"}</div>
          <div class="recorder-value">${escapeHtml(r.recordedByName || r.createdByName || "-")}</div>
        </div>
        <div style="text-align:right">
          <div class="recorder-label">ITS ID</div>
          <div class="recorder-value">${escapeHtml(r.recordedByItsId || r.createdByItsNo || "-")}</div>
        </div>
      </div>

      <div class="signature">Authorised Signature</div>

      <div class="footer">
        <span>Computer-generated ${documentType.toLowerCase()}. Please retain it for your records.</span>
        <span>Generated by JamaatOne</span>
      </div>
    </div>
  </div>
</body>
</html>`;
};
