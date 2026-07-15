export const ANNOUNCEMENT_TYPES = [
  { label: "General", value: "GENERAL" },
  { label: "Majlis", value: "MAJLIS" },
  { label: "Waaz", value: "WAAZ" },
  { label: "Sabaq", value: "SABAQ" },
  { label: "FMB", value: "FMB" },
  { label: "Accounts", value: "ACCOUNTS" },
  { label: "Emergency", value: "EMERGENCY" }
];

export const getAnnouncementTypeLabel = value =>
  ANNOUNCEMENT_TYPES.find(item => item.value === value)?.label || value || "General";
