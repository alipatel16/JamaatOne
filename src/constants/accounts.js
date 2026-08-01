export const USER_GRADES = ["A", "B", "C"];

export const PAYMENT_TYPES = [
  { label: "FMB", value: "FMB" },
  { label: "Sabil", value: "SABIL" },
  { label: "Lagat", value: "LAGAT" },
  { label: "Niyaz", value: "NIYAZ" },
  { label: "Donation (Hub)", value: "DONATION_HUB" },
  { label: "Madrasa Fee", value: "MADRASA_FEE" },
  { label: "Others", value: "OTHERS" }
];

export const LAGAT_TYPES = [
  { label: "Rent of Mawaid", value: "RENT_OF_MAWAID" },
  { label: "Rent of Mawaid with AC", value: "RENT_OF_MAWAID_WITH_AC" },
  { label: "Aqiqa Lagat", value: "AQIQA_LAGAT" },
  { label: "Shadi Lagat", value: "SHADI_LAGAT" },
  { label: "Waras Jaman Lagat", value: "WARAS_JAMAN_LAGAT" },
  { label: "Utensils Lagat Receipt", value: "UTENSILS_LAGAT_RECEIPT" },
  { label: "Others Lagat", value: "OTHERS_LAGAT" },
  { label: "Urs Jaman Mawaid Lagat", value: "URS_JAMAN_MAWAID_LAGAT" },
  { label: "Fateha Jaman Lagat", value: "FATEHA_JAMAN_LAGAT" },
  { label: "Bairao Majlis Lagat", value: "BAIRAO_MAJLIS_LAGAT" },
  { label: "Misaq Lagat", value: "MISAQ_LAGAT" },
  { label: "Shehra Lagat", value: "SHEHRA_LAGAT" }
];

export const DONATION_TYPES = [
  { label: "Madrasa Hub", value: "MADRASA_HUB" },
  { label: "Kabrastan Hub", value: "KABRASTAN_HUB" },
  { label: "Masjid Hub", value: "MASJID_HUB" },
  { label: "Jumaat Hub", value: "JUMAAT_HUB" }
];

export const MADRASA_FEE_TYPES = [
  { label: "Admission Fee", value: "ADMISSION_FEE" },
  { label: "Monthly Fee", value: "MONTHLY_FEE" },
  { label: "Exam Fee", value: "EXAM_FEE" }
];

export const PAYMENT_METHODS = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Bank transfer", value: "BANK_TRANSFER" },
  { label: "Cheque", value: "CHEQUE" },
  { label: "Other", value: "OTHER" }
];

export const ENTRY_TYPES = [
  { label: "Debit (expense)", value: "DEBIT" },
  { label: "Credit (income)", value: "CREDIT" }
];

export const BANK_ACCOUNTS = [
  {
    label: "General Jamaat Account",
    value: "AXIS_GENERAL",
    bankName: "Axis Bank",
    accountNumber: "918020047138869",
    accountName: "DAWOODI BOHRA JAMAT VIRAMGAM"
  },
  {
    label: "Vajebat Amanat Account",
    value: "AXIS_VAJEBAT_AMANAT",
    bankName: "Axis Bank",
    accountNumber: "918020045691175",
    accountName: "DAWOODI BOHRA JAMAT VIRAMGAM AC VAJEBAT AMANAT"
  },
  {
    label: "Madrasa Saifiyah Account",
    value: "AXIS_MADRASA",
    bankName: "Axis Bank",
    accountNumber: "918020053899679",
    accountName: "DAWOODI BOHRA JAMAT VIRAMGAM AC MADRESA SAIFIYAH"
  },
  {
    label: "Anjuman-e-Najmi FMB Account",
    value: "AXIS_FMB",
    bankName: "Axis Bank",
    accountNumber: "918020052562147",
    accountName: "DAWOODI BOHRA JAMAT AC ANJAUMAN E NAJMI FMB"
  }
];

export const getOptionLabel = (options, value) =>
  options.find(item => item.value === value)?.label || value || "-";

export const getPaymentSubtypeOptions = paymentFor =>
  paymentFor === "LAGAT"
    ? LAGAT_TYPES
    : paymentFor === "DONATION_HUB"
      ? DONATION_TYPES
      : paymentFor === "MADRASA_FEE"
        ? MADRASA_FEE_TYPES
        : [];
