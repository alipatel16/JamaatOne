function roleGrantPayload(kind, account, categoryIds = []) {
  const userId = Number(account?.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("Select an existing user account.");
  if (kind === "FMB") return { userId, body: { roleId: 5 } };
  if (kind !== "COMMITTEE") throw new Error("Select a supported role.");
  const ids = [...new Set(categoryIds.map(Number))];
  if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error("Select at least one payment category.");
  return { userId, body: { roleId: 3, categoryIds: ids } };
}

function apiDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw new Error("Select a valid start date.");
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("Select a valid start date.");
  return parsed.toISOString();
}

function startThaaliPayload(id, date) {
  const muminId = Number(id);
  if (!Number.isSafeInteger(muminId) || muminId <= 0) throw new Error("Select a Mumin.");
  return { muminId, startDate: apiDate(date) };
}

function bulkStartPayload(members, date) {
  if (!members.length || members.length > 500) throw new Error("Select between 1 and 500 Mumineen.");
  const muminIds = members.map(item => startThaaliPayload(item.muminId, date).muminId);
  if (new Set(muminIds).size !== muminIds.length) throw new Error("Select each Mumin only once.");
  return { action: "Start", muminIds, date: apiDate(date) };
}

function failedBulkMembers(selected, response) {
  if (Number(response?.successCount) === selected.length && Number(response?.failedCount) === 0) return [];
  const successful = new Set((response?.results || []).filter(item => item.success === true).map(item => Number(item.muminId)));
  return selected.filter(item => !successful.has(Number(item.muminId)));
}

function dayValue(value) { return String(value || "").slice(0, 10); }
function checkedDate(value, label = "date") {
  try { return apiDate(value); } catch { throw new Error(`Select a valid ${label}.`); }
}
function reasonValue(value, required = false) {
  const reason = String(value || "").trim();
  if (required && !reason) throw new Error("Enter a reason.");
  if (reason.length > 500) throw new Error("Reason must be 500 characters or fewer.");
  return reason;
}
function stopThaaliPayload(form) {
  return { endDate: checkedDate(form.endDate, "end date"), reason: reasonValue(form.reason, true) };
}
function updateThaaliPayload(form) {
  const body = { startDate: checkedDate(form.startDate, "start date") };
  if (form.endDate) {
    if (form.endDate < form.startDate) throw new Error("End date cannot be before start date.");
    Object.assign(body, stopThaaliPayload(form));
  }
  return body;
}
function pauseThaaliPayload(form, onBehalf, today) {
  const body = { fromDate: checkedDate(form.fromDate, "from date"), toDate: checkedDate(form.toDate, "to date"), reason: reasonValue(form.reason) || null };
  if (form.fromDate < today) throw new Error("Pause must start today or later.");
  if (form.toDate < form.fromDate) throw new Error("To date cannot be before from date.");
  if (onBehalf) {
    const id = Number(form.muminId);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("Select a member.");
    body.muminId = id;
  }
  return body;
}
function resumeThaaliPayload(form, pause, today) {
  const resumeDate = checkedDate(form.resumeDate, "resume date");
  if (form.resumeDate < today) throw new Error("Resume date must be today or later.");
  if (form.resumeDate > dayValue(pause.toDate)) throw new Error("Resume date cannot be after the pause's last day.");
  return { resumeDate, reason: reasonValue(form.reason) || null };
}
function parseMenu(value) {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { throw new Error("Enter a valid JSON object or array for the menu."); }
  }
  return value;
}
function checkedMenu(value) {
  const menu = parseMenu(value ?? {});
  if (!menu || typeof menu !== "object") throw new Error("Menu must be a JSON object or array.");
  if (JSON.stringify(menu).length > 100000) throw new Error("Menu must be 100,000 characters or fewer.");
  return menu;
}
function createMenusPayload(entries) {
  if (!entries.length || entries.length > 22) throw new Error("Add between 1 and 22 menu dates.");
  const dates = new Set();
  return entries.map(entry => {
    checkedDate(entry.date);
    if (dates.has(entry.date)) throw new Error("Do not add the same date twice.");
    dates.add(entry.date);
    return { menuDate: checkedDate(entry.date), menuJson: checkedMenu(entry.menu) };
  });
}
function updateMenuPayload(entry) { return { menuDate: checkedDate(entry.date), menuJson: checkedMenu(entry.menu) }; }
function menuForDate(items, date) { return (items || []).find(item => dayValue(item.menuDate || item.date) === date) || null; }

module.exports = { roleGrantPayload, startThaaliPayload, bulkStartPayload, failedBulkMembers, dayValue, stopThaaliPayload, updateThaaliPayload, pauseThaaliPayload, resumeThaaliPayload, parseMenu, createMenusPayload, updateMenuPayload, menuForDate };
