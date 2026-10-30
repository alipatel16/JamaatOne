const test = require("node:test");
const assert = require("node:assert/strict");
const { roleNames, hasRole, sessionUser } = require("../src/utils/userRoles");

test("reads every role from the new login response regardless of order", () => {
  const user = { roles: [{ roleId: 5, roleName: "FMB_User" }, { roleId: 3, roleName: "Committee_Member" }] };
  assert.deepEqual(roleNames(user), ["FMB_USER", "COMMITTEE_MEMBER"]);
  assert.equal(hasRole(user, "Committee_Member"), true);
  assert.equal(hasRole(user, "Aamil"), false);
});
test("supports old sessions but an explicit roles array overrides stale scalar roles", () => {
  assert.equal(hasRole({ roleName: "Aamil" }, "AAMIL"), true);
  assert.equal(hasRole({ roles: [], role: "AAMIL" }, "AAMIL"), false);
  assert.equal(hasRole({ roles: [{ roleName: "FMB_User" }], role: "AAMIL" }, "AAMIL"), false);
});
test("maps array login sessions and legacy sessions without losing identity", () => {
  const user = sessionUser({ userId: 4, itsNo: "12345678", roles: [{ roleId: 3, roleName: "Committee_Member" }], jamaatId: 1 });
  assert.equal(user.userId, 4);
  assert.equal(user.itsId, "12345678");
  assert.equal(user.role, "COMMITTEE_MEMBER");
  assert.equal(user.roles[0].roleId, 3);
  assert.equal(sessionUser({ userId: 2, roleName: "Aamil", roleId: 2 }).role, "AAMIL");
});
