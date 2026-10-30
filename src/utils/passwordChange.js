function passwordChangePayload(form) {
  const itsNo = String(form.itsNo || "").trim();
  if (!/^\d{8}$/.test(itsNo)) throw new Error("Enter a valid 8-digit ITS number.");
  if (!form.oldPassword) throw new Error("Enter your current password.");
  if (String(form.newPassword || "").length < 8) throw new Error("New password must have at least 8 characters.");
  if (form.newPassword !== form.confirmPassword) throw new Error("New passwords do not match.");
  return { itsNo, oldPassword: form.oldPassword, newPassword: form.newPassword };
}

module.exports = { passwordChangePayload };
