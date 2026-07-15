export const USER_GRADES = ["A", "B", "C"];

export const PAYMENT_TYPES = [
  { label: "FMB", value: "FMB" },
  { label: "Sabil", value: "SABIL" },
  { label: "Lagat", value: "LAGAT" },
  { label: "Niyaz", value: "NIYAZ" },
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
];

export const PAYMENT_METHODS = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Bank transfer", value: "BANK_TRANSFER" },
  { label: "Cheque", value: "CHEQUE" },
  { label: "Other", value: "OTHER" },
];

export const getOptionLabel = (options, value) =>
  options.find((item) => item.value === value)?.label || value || "-";
