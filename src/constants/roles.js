export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
};

export const canManageJamaat = (role) =>
  role === ROLES.ADMIN || role === ROLES.COMMITTEE_MEMBER;

export const canManageUsers = (role) => role === ROLES.ADMIN;
