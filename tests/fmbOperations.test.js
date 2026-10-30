const test = require("node:test");
const assert = require("node:assert/strict");
const f = require("../src/utils/fmbWorkflows");

test("Thali stop requires a last day and reason; corrections allow ongoing periods", () => {
  assert.throws(() => f.stopThaaliPayload({ endDate: "2026-10-30", reason: " " }), /reason/i);
  assert.throws(() => f.stopThaaliPayload({ endDate: "2026-02-30", reason: "Leaving" }), /date/i);
  assert.deepEqual(f.stopThaaliPayload({ endDate: "2026-10-30", reason: " Leaving " }), { endDate: "2026-10-30T12:00:00.000Z", reason: "Leaving" });
  assert.deepEqual(f.updateThaaliPayload({ startDate: "2026-10-01", endDate: "" }), { startDate: "2026-10-01T12:00:00.000Z" });
  assert.throws(() => f.updateThaaliPayload({ startDate: "2026-10-30", endDate: "2026-10-01", reason: "Correction" }), /before/i);
});

test("personal pauses omit member IDs; on-behalf pauses require a selected member", () => {
  const dates = { fromDate: "2026-10-30", toDate: "2026-11-02", reason: "Travelling", muminId: 44 };
  assert.equal(Object.hasOwn(f.pauseThaaliPayload(dates, false, "2026-10-29"), "muminId"), false);
  assert.equal(f.pauseThaaliPayload(dates, true, "2026-10-29").muminId, 44);
  assert.throws(() => f.pauseThaaliPayload({ ...dates, muminId: null }, true, "2026-10-29"), /member/i);
  assert.throws(() => f.pauseThaaliPayload(dates, false, "2026-10-31"), /today/i);
  assert.throws(() => f.pauseThaaliPayload({ ...dates, toDate: "2026-10-29" }, false, "2026-10-29"), /before/i);
  assert.throws(() => f.pauseThaaliPayload({ ...dates, reason: "a".repeat(501) }, false, "2026-10-29"), /500/);
});

test("resume is the first serving day and can cancel a future pause", () => {
  const pause = { fromDate: "2026-11-02T00:00:00Z", toDate: "2026-11-05T00:00:00Z" };
  assert.equal(f.resumeThaaliPayload({ resumeDate: "2026-10-30" }, pause, "2026-10-29").resumeDate, "2026-10-30T12:00:00.000Z");
  assert.throws(() => f.resumeThaaliPayload({ resumeDate: "2026-11-06" }, pause, "2026-10-29"), /last day/i);
  assert.throws(() => f.resumeThaaliPayload({ resumeDate: "2026-10-28" }, pause, "2026-10-29"), /today/i);
});

test("menu creation sends menuDate/menuJson arrays, accepts date only, and limits unique dates to 22", () => {
  assert.deepEqual(f.createMenusPayload([{ date: "2026-10-29", menu: {} }]), [{ menuDate: "2026-10-29T12:00:00.000Z", menuJson: {} }]);
  const entries = Array.from({ length: 22 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, menu: { mainCourse1: "Rice" } }));
  assert.equal(f.createMenusPayload(entries).length, 22);
  for (const entry of f.createMenusPayload(entries)) {
    assert.deepEqual(Object.keys(entry).sort(), ["menuDate", "menuJson"]);
    assert.deepEqual(entry.menuJson, { mainCourse1: "Rice" });
  }
  assert.throws(() => f.createMenusPayload([...entries, { date: "2026-11-23", menu: {} }]), /22/);
  assert.throws(() => f.createMenusPayload([entries[0], entries[0]]), /same date/i);
  assert.throws(() => f.createMenusPayload([{ date: "2026-02-30", menu: {} }]), /date/i);
  assert.throws(() => f.createMenusPayload([{ date: "2026-10-29", menu: "bad json" }]), /JSON/i);
  assert.deepEqual(f.updateMenuPayload({ date: "2026-10-29", menu: [{ custom: "Dish" }] }), { menuDate: "2026-10-29T12:00:00.000Z", menuJson: [{ custom: "Dish" }] });
});

test("today's menu is matched by date even if the API includes neighboring dates", () => {
  const items = [{ menuId: 1, menuDate: "2026-10-28T00:00:00Z" }, { menuId: 2, menuDate: "2026-10-29T00:00:00Z", menuJson: '{"fruits":"Dates"}' }];
  assert.equal(f.menuForDate(items, "2026-10-29").menuId, 2);
  assert.equal(f.menuForDate(items, "2026-10-30"), null);
  assert.deepEqual(f.parseMenu(items[1].menuJson), { fruits: "Dates" });
});
