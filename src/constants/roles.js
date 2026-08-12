export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  AAMIL: "AAMIL",
  ADMIN: "ADMIN",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
  FMB_USER: "FMB_USER",
  MADARSA_ADMIN: "MADARSA_ADMIN",
  USER: "USER"
};

export function normalizeRole(roleName) {
  const normalized = String(roleName || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "SUPERADMIN") return ROLES.SUPER_ADMIN;
  if (normalized === "AMIL") return ROLES.AAMIL;
  if (normalized === "COMMITTEEMEMBER") return ROLES.COMMITTEE_MEMBER;
  if (["FMBUSER", "FMB"].includes(normalized)) return ROLES.FMB_USER;
  if (["MADARSAADMIN", "MADRASAADMIN", "MADRASA_ADMIN"].includes(normalized)) {
    return ROLES.MADARSA_ADMIN;
  }
  if (Object.values(ROLES).includes(normalized)) return normalized;
  return normalized || ROLES.USER;
}

const roleFrom = roleOrUser =>
  normalizeRole(
    typeof roleOrUser === "object"
      ? roleOrUser?.role || roleOrUser?.roleName
      : roleOrUser
  );

export const isSuperAdmin = roleOrUser => roleFrom(roleOrUser) === ROLES.SUPER_ADMIN;
export const isAamil = roleOrUser => {
  const role = roleFrom(roleOrUser);
  // Older JamaatOne builds used ADMIN for the same Jamaat-level authority.
  // Keep that alias so existing Aamil accounts do not lose access after the
  // Users-controller migration.
  return role === ROLES.AAMIL || role === ROLES.ADMIN;
};
export const isCommitteeMember = roleOrUser => roleFrom(roleOrUser) === ROLES.COMMITTEE_MEMBER;
export const isFmbUser = roleOrUser => roleFrom(roleOrUser) === ROLES.FMB_USER;
export const isMadarsaAdmin = roleOrUser => roleFrom(roleOrUser) === ROLES.MADARSA_ADMIN;

export const canManageJamaat = roleOrUser => {
  const role = roleFrom(roleOrUser);
  return [ROLES.AAMIL, ROLES.ADMIN, ROLES.COMMITTEE_MEMBER].includes(role);
};

export const canManageAccounts = canManageJamaat;

// User/role management is intentionally Aamil-only. Committee members have
// broad operational access but cannot manage privileged application users.
export const canManageUsers = roleOrUser => isAamil(roleOrUser);

// Committee members can perform normal operational actions, including edits
// and refunds, but destructive DELETE actions are reserved for Aamil/admin.
export const canDeleteJamaatData = roleOrUser => isAamil(roleOrUser);

export const canRefundPayments = roleOrUser => canManageJamaat(roleOrUser);

export const canManageFmb = roleOrUser =>
  canManageJamaat(roleOrUser) || isFmbUser(roleOrUser);

// Madrasa Admin is deliberately isolated from FMB. Existing normal members
// retain the personal FMB experience already present in the app.
export const canAccessFmb = roleOrUser => !isMadarsaAdmin(roleOrUser);

export const canAccessMumineen = roleOrUser =>
  canManageJamaat(roleOrUser) || isFmbUser(roleOrUser) || isMadarsaAdmin(roleOrUser);

// Editing/importing Mumineen remains a management capability. FMB users and
// Madrasa admins can browse the directory and open member details read-only.
export const canManageMumineen = roleOrUser => canManageJamaat(roleOrUser);
export const canManageAnnouncements = roleOrUser => canManageJamaat(roleOrUser);

// The Madrasa module itself will be added later; this capability is ready now
// so future routing can be wired without changing the role model again.
export const canAccessMadarsa = roleOrUser =>
  canManageJamaat(roleOrUser) || isMadarsaAdmin(roleOrUser);
