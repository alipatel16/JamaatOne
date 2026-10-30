function normalizeRole(value) {
  const role = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ({ SUPERADMIN: "SUPER_ADMIN", AMIL: "AAMIL", COMMITTEEMEMBER: "COMMITTEE_MEMBER", FMBUSER: "FMB_USER", FMBADMIN: "FMB_ADMIN", FMB: "FMB_USER", MADARSAADMIN: "MADARSA_ADMIN", MADRASAADMIN: "MADARSA_ADMIN", MADRASA_ADMIN: "MADARSA_ADMIN" })[role] || role || "USER";
}

function userRoles(value) {
  const source = Array.isArray(value) ? value : Array.isArray(value?.roles) ? value.roles
    : typeof value === "string" ? [value] : value?.role || value?.roleName ? [{ roleId: value.roleId, roleName: value.role || value.roleName }] : [];
  const unique = new Map();
  for (const item of source) {
    const name = typeof item === "string" ? item : item?.roleName || item?.role;
    if (!name) continue;
    const roleName = normalizeRole(name);
    unique.set(roleName, { roleId: typeof item === "object" ? item.roleId : undefined, roleName });
  }
  return [...unique.values()];
}

const roleNames = value => userRoles(value).map(item => item.roleName);
const hasRole = (value, role) => roleNames(value).includes(normalizeRole(role));
const canAccessAccounts = value => ["AAMIL", "ADMIN", "COMMITTEE_MEMBER"].some(role => hasRole(value, role));

function sessionUser(session) {
  if (!session) return null;
  const roles = userRoles(session);
  const priority = ["SUPER_ADMIN", "AAMIL", "ADMIN", "COMMITTEE_MEMBER", "FMB_ADMIN", "FMB_USER", "MADARSA_ADMIN", "USER"];
  const primary = priority.find(name => roles.some(role => role.roleName === name)) || "USER";
  return {
    id: session.userId, userId: session.userId, itsId: session.itsNo, itsNo: session.itsNo,
    name: session.name, roles, role: primary,
    roleId: roles.find(role => role.roleName === primary)?.roleId,
    roleName: roles.map(role => role.roleName).join(", ") || "Member",
    jamaatId: session.jamaatId ?? null
  };
}

module.exports = { normalizeRole, userRoles, roleNames, hasRole, canAccessAccounts, sessionUser };
