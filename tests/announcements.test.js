const test = require("node:test");
const assert = require("node:assert/strict");
const { announcementPayload, newestAnnouncements } = require("../src/utils/announcements");
const { timePickerDate, selectedTime } = require("../src/utils/timePicker");

test("announcements send only contract text and enforce the 4000-character limit", () => {
  assert.deepEqual(announcementPayload("  Salaam\nNew community update  "), { announcement: "Salaam\nNew community update" });
  assert.throws(() => announcementPayload(" \n "), /announcement/i);
  assert.equal(announcementPayload("a".repeat(4000)).announcement.length, 4000);
  assert.throws(() => announcementPayload("a".repeat(4001)), /4,000/);
});
test("dashboard ordering is newest first and older announcements never expire locally", () => {
  const items = [{ announcementId: 1, createdAt: "2020-01-01", announcement: "Old but not deleted" }, { announcementId: 2, createdAt: "2026-10-29", announcement: "New" }];
  const result = newestAnnouncements(items);
  assert.deepEqual(result.map(item => item.announcementId), [2, 1]);
  assert.equal(items[0].announcementId, 1);
});
test("clock selections preserve HH:mm wall time without UTC conversion", () => {
  assert.equal(selectedTime(new Date(2026, 9, 29, 0, 5)), "00:05");
  assert.equal(selectedTime(new Date(2026, 9, 29, 13, 9)), "13:09");
  const date = timePickerDate("23:45", new Date(2026, 9, 29, 11, 0));
  assert.equal(date.getHours(), 23); assert.equal(date.getMinutes(), 45);
  assert.equal(selectedTime(timePickerDate("", new Date(2026, 9, 29, 11, 25))), "11:25");
});
