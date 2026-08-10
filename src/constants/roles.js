export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  AAMIL: "AAMIL",
  ADMIN: "ADMIN",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
  USER: "USER"
};

export function normalizeRole(roleName) {
  const normalized = String(roleName || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "SUPERADMIN") return ROLES.SUPER_ADMIN;
  if (normalized === "COMMITTEEMEMBER") return ROLES.COMMITTEE_MEMBER;
  if (Object.values(ROLES).includes(normalized)) return normalized;
  return normalized || ROLES.USER;
}

export const isSuperAdmin = roleOrUser =>
  normalizeRole(
    typeof roleOrUser === "object"
      ? roleOrUser?.role || roleOrUser?.roleName
      : roleOrUser
  ) === ROLES.SUPER_ADMIN;

export const canManageJamaat = role => {
  const normalized = normalizeRole(role);
  return (
    normalized === ROLES.AAMIL ||
    normalized === ROLES.ADMIN ||
    normalized === ROLES.COMMITTEE_MEMBER
  );
};

export const canManageUsers = role => {
  const normalized = normalizeRole(role);
  return normalized === ROLES.AAMIL || normalized === ROLES.ADMIN;
};


export const canRefundPayments = role => {
  const normalized = normalizeRole(role);
  return normalized === ROLES.AAMIL || normalized === ROLES.ADMIN;
};
