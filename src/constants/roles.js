import { normalizeRole, hasRole } from "../utils/userRoles";
export { normalizeRole, hasRole };

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  AAMIL: "AAMIL",
  ADMIN: "ADMIN",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
  FMB_USER: "FMB_USER",
  FMB_ADMIN: "FMB_ADMIN",
  MADARSA_ADMIN: "MADARSA_ADMIN",
  USER: "USER"
};

export const isSuperAdmin = user => hasRole(user, ROLES.SUPER_ADMIN);
export const isAamil = user => hasRole(user, ROLES.AAMIL) || hasRole(user, ROLES.ADMIN);
export const isCommitteeMember = user => hasRole(user, ROLES.COMMITTEE_MEMBER);
export const isFmbUser = user => hasRole(user, ROLES.FMB_USER);
export const isFmbAdmin = user => hasRole(user, ROLES.FMB_ADMIN);
export const canEditFmb = user => isAamil(user) || isFmbAdmin(user);
export const isMadarsaAdmin = user => hasRole(user, ROLES.MADARSA_ADMIN);
export const canManageJamaat = user => isAamil(user) || isCommitteeMember(user);

export const canManageAccounts = canManageJamaat;
export const canViewAccounts = user => Boolean(user) && !isSuperAdmin(user);

// Aamil manages all supported users; FMB Admin is limited to FMB users in the UI.
export const canManageUsers = user => isAamil(user) || isFmbAdmin(user);

// Committee members can record and view operational account data, but
// mutations of existing records (edit/delete/refund) are Aamil-only.
export const canDeleteJamaatData = roleOrUser => isAamil(roleOrUser);

export const canRefundPayments = roleOrUser => isAamil(roleOrUser);

export const canManageFmb = roleOrUser =>
  canManageJamaat(roleOrUser) || isFmbUser(roleOrUser) || isFmbAdmin(roleOrUser);

// Madrasa Admin is deliberately isolated from FMB. Existing normal members
// retain the personal FMB experience already present in the app.
export const canAccessFmb = user => !isMadarsaAdmin(user) || isAamil(user) || isCommitteeMember(user) || isFmbUser(user) || isFmbAdmin(user);

export const canAccessMumineen = roleOrUser =>
  canManageJamaat(roleOrUser) || isFmbUser(roleOrUser) || isFmbAdmin(roleOrUser) || isMadarsaAdmin(roleOrUser);

// Editing/importing Mumineen remains a management capability. FMB users and
// Madrasa admins can browse the directory and open member details read-only.
export const canManageMumineen = roleOrUser => canManageJamaat(roleOrUser);
export const canManageAnnouncements = roleOrUser => isAamil(roleOrUser) || isCommitteeMember(roleOrUser);

// The Madrasa module itself will be added later; this capability is ready now
// so future routing can be wired without changing the role model again.
export const canAccessMadarsa = roleOrUser =>
  canManageJamaat(roleOrUser) || isMadarsaAdmin(roleOrUser);
