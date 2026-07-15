export const USER_RELATIONS = [
  { label: "Head of family", value: "HOF" },
  { label: "Husband", value: "HUSBAND" },
  { label: "Wife", value: "WIFE" },
  { label: "Daughter-in-law", value: "DAUGHTER_IN_LAW" },
  { label: "Father", value: "FATHER" },
  { label: "Mother", value: "MOTHER" },
  { label: "Son", value: "SON" },
  { label: "Daughter", value: "DAUGHTER" },
  { label: "Brother", value: "BROTHER" },
  { label: "Sister", value: "SISTER" },
  { label: "Grandfather", value: "GRANDFATHER" },
  { label: "Grandmother", value: "GRANDMOTHER" },
  { label: "Grandson", value: "GRANDSON" },
  { label: "Granddaughter", value: "GRANDDAUGHTER" },
  { label: "Other", value: "OTHER" }
];

export const getRelationLabel = value =>
  USER_RELATIONS.find(item => item.value === value)?.label || value || "-";
