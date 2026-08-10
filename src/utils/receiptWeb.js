const escapePdfText = value =>
  String(value ?? "-")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll(/[^\x20-\x7E]/g, " ");

const normalizeLabel = value =>
  String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, character => character.toUpperCase());

const formatAmount = value =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function wrapText(value, maxCharacters = 74) {
  const words = String(value || "-").split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharacters) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
}

function createPdfDocument(receipt) {
  const commands = [];
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  const text = (x, y, value, size = 10, font = "F1", color = "0.15 0.19 0.18") => {
    commands.push(
      `${color} rg BT /${font} ${size} Tf ${x} ${pageHeight - y} Td (${escapePdfText(value)}) Tj ET`
    );
  };

  const rect = (x, y, width, height, fillColor, radius = 0) => {
    const pdfY = pageHeight - y - height;
    if (!radius) {
      commands.push(`${fillColor} rg ${x} ${pdfY} ${width} ${height} re f`);
      return;
    }

    const k = 0.5522847498;
    const r = Math.min(radius, width / 2, height / 2);
    const top = pdfY + height;
    const right = x + width;
    commands.push(
      `${fillColor} rg ` +
        `${x + r} ${pdfY} m ` +
        `${right - r} ${pdfY} l ` +
        `${right - r + r * k} ${pdfY} ${right} ${pdfY + r - r * k} ${right} ${pdfY + r} c ` +
        `${right} ${top - r} l ` +
        `${right} ${top - r + r * k} ${right - r + r * k} ${top} ${right - r} ${top} c ` +
        `${x + r} ${top} l ` +
        `${x + r - r * k} ${top} ${x} ${top - r + r * k} ${x} ${top - r} c ` +
        `${x} ${pdfY + r} l ` +
        `${x} ${pdfY + r - r * k} ${x + r - r * k} ${pdfY} ${x + r} ${pdfY} c f`
    );
  };

  const line = (x1, y1, x2, y2, color = "0.88 0.91 0.89", width = 0.7) => {
    commands.push(
      `${color} RG ${width} w ${x1} ${pageHeight - y1} m ${x2} ${pageHeight - y2} l S`
    );
  };

  const paymentSubtype =
    receipt.otherDescription ||
    receipt.subType ||
    receipt.lagatType ||
    receipt.paymentFor;

  rect(24, 24, 547, 794, "1 1 1", 14);
  rect(24, 24, 547, 112, "0.20 0.29 0.26", 14);
  rect(24, 116, 547, 20, "0.20 0.29 0.26");

  text(52, 54, "OFFICIAL PAYMENT RECEIPT", 9, "F2", "0.91 0.83 0.67");
  text(
    52,
    78,
    "Dawoodi Bohra Jamaat",
    20,
    "F2",
    "1 1 1"
  );
  text(52, 101, receipt.jamaatName, 9, "F1", "0.84 0.89 0.87");

  rect(386, 46, 155, 67, "0.27 0.37 0.33", 9);
  text(402, 65, "RECEIPT NUMBER", 8, "F2", "0.84 0.89 0.87");
  text(402, 84, receipt.receiptNumber || "-", 13, "F2", "1 1 1");
  text(402, 102, receipt.paymentDate || "-", 8, "F1", "0.91 0.83 0.67");

  rect(52, 160, 489, 84, "0.97 0.94 0.88", 12);
  text(72, 184, "AMOUNT RECEIVED", 8, "F2", "0.48 0.41 0.31");
  text(72, 207, normalizeLabel(paymentSubtype), 11, "F2", "0.48 0.41 0.31");
  text(370, 195, `INR ${formatAmount(receipt.amount)}`, 22, "F2", "0.20 0.29 0.26");
  text(370, 216, receipt.amountInWords || "", 8, "F1", "0.43 0.42 0.39");

  text(52, 276, "MEMBER DETAILS", 8, "F2", "0.48 0.52 0.50");
  rect(52, 288, 489, receipt.paidForUserName ? 105 : 78, "0.98 0.99 0.98", 9);

  const memberRows = [
    ["Paid by", receipt.userName || "-"],
    ["ITS ID / Grade", `${receipt.itsId || "-"} / ${receipt.userGrade || "-"}`]
  ];
  if (receipt.paidForUserName) {
    memberRows.push([
      "Madrasa fee paid for",
      `${receipt.paidForUserName}${receipt.paidForItsId ? ` - ITS ${receipt.paidForItsId}` : ""}`
    ]);
  }

  memberRows.forEach(([key, value], index) => {
    const rowY = 310 + index * 27;
    text(68, rowY, key, 8, "F1", "0.48 0.52 0.50");
    text(215, rowY, value, 9, "F2");
    if (index < memberRows.length - 1) line(68, rowY + 12, 525, rowY + 12);
  });

  const paymentSectionY = receipt.paidForUserName ? 424 : 397;
  text(52, paymentSectionY, "PAYMENT DETAILS", 8, "F2", "0.48 0.52 0.50");
  rect(52, paymentSectionY + 12, 489, 112, "0.98 0.99 0.98", 9);

  const paymentRows = [
    ["Payment category", normalizeLabel(paymentSubtype)],
    [
      "Payment method",
      `${normalizeLabel(receipt.paymentMethod)}${receipt.referenceNumber ? ` - ${receipt.referenceNumber}` : ""}`
    ],
    ["Notes", receipt.notes || "-"]
  ];

  paymentRows.forEach(([key, value], index) => {
    const rowY = paymentSectionY + 36 + index * 31;
    text(68, rowY, key, 8, "F1", "0.48 0.52 0.50");
    const lines = wrapText(value, 50).slice(0, 2);
    lines.forEach((entry, lineIndex) => {
      text(215, rowY + lineIndex * 11, entry, 9, "F2");
    });
    if (index < paymentRows.length - 1) line(68, rowY + 16, 525, rowY + 16);
  });

  const recorderY = paymentSectionY + 148;
  rect(52, recorderY, 489, 66, "0.93 0.95 0.97", 9);
  text(68, recorderY + 22, "PAYMENT RECORDED BY", 8, "F2", "0.39 0.45 0.52");
  text(
    68,
    recorderY + 44,
    receipt.recordedByName || receipt.createdByName || "-",
    10,
    "F2"
  );
  text(402, recorderY + 22, "ITS ID", 8, "F2", "0.39 0.45 0.52");
  text(
    402,
    recorderY + 44,
    receipt.recordedByItsId || receipt.createdByItsId || "-",
    10,
    "F2"
  );

  line(360, recorderY + 132, 520, recorderY + 132, "0.48 0.52 0.50", 0.8);
  text(388, recorderY + 149, "Authorised Signature", 8, "F1", "0.48 0.52 0.50");

  line(52, 775, 541, 775);
  text(52, 794, "Computer-generated receipt. Please retain it for your records.", 7, "F1", "0.54 0.58 0.56");
  text(458, 794, "JamaatOne", 7, "F2", "0.54 0.58 0.56");

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function printReceiptOnly(html) {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.srcdoc = html;

      iframe.onload = () => {
        const printWindow = iframe.contentWindow;
        if (!printWindow) {
          iframe.remove();
          reject(new Error("Unable to open the receipt print document."));
          return;
        }

        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => iframe.remove(), 1000);
          resolve();
        }, 250);
      };

      document.body.appendChild(iframe);
    } catch (error) {
      reject(error);
    }
  });
}


export function printReceiptPdf(receipt) {
  const blob = createPdfDocument(receipt);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error(
      "The browser blocked the receipt window. Please allow pop-ups and try again."
    );
  }

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      // The PDF is already open in the browser's PDF viewer. If automatic
      // printing is restricted, the user can use the viewer's Print button.
    }
  };

  // PDF viewers need additional time after the window load event to render
  // the document. Both attempts use the exact blob used by Download PDF.
  printWindow.addEventListener("load", () => {
    setTimeout(triggerPrint, 900);
  });
  setTimeout(triggerPrint, 1600);

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function downloadReceiptPdf(receipt) {
  const blob = createPdfDocument(receipt);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${receipt.receiptNumber || "JamaatOne-receipt"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
