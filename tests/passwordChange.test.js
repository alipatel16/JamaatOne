const test = require("node:test");
const assert = require("node:assert/strict");
const { passwordChangePayload } = require("../src/utils/passwordChange");

const form = { itsNo: " 12345678 ", oldPassword: "old password", newPassword: "new password", confirmPassword: "new password" };

test("builds the change-password contract without sending password confirmation", () => {
  assert.deepEqual(passwordChangePayload(form), { itsNo: "12345678", oldPassword: "old password", newPassword: "new password" });
});

test("requires an eight-digit ITS, current password, valid new password and matching confirmation", () => {
  for (const changes of [
    { itsNo: "123" }, { itsNo: "abcdefgh" }, { oldPassword: "" },
    { newPassword: "short", confirmPassword: "short" }, { confirmPassword: "different" }
  ]) assert.throws(() => passwordChangePayload({ ...form, ...changes }));
});

test("preserves password whitespace instead of silently changing credentials", () => {
  const payload = passwordChangePayload({ ...form, oldPassword: " old ", newPassword: " new password ", confirmPassword: " new password " });
  assert.equal(payload.oldPassword, " old ");
  assert.equal(payload.newPassword, " new password ");
});
