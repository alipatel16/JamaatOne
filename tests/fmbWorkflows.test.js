const test = require("node:test");
const assert = require("node:assert/strict");
const { roleGrantPayload, startThaaliPayload, bulkStartPayload, failedBulkMembers } = require("../src/utils/fmbWorkflows");

test("existing accounts get the requested role without account creation fields", () => {
  assert.deepEqual(roleGrantPayload("FMB", { userId: 40 }, [2, 3]), { userId: 40, body: { roleId: 5 } });
  assert.deepEqual(roleGrantPayload("COMMITTEE", { userId: 80 }, ["2"]), { userId: 80, body: { roleId: 3, categoryIds: [2] } });
  assert.throws(() => roleGrantPayload("COMMITTEE", { userId: 80 }, []));
  assert.throws(() => roleGrantPayload("FMB", { muminId: 80 }, []));
});
test("Thali starts use mumin IDs and real calendar dates", () => {
  assert.deepEqual(startThaaliPayload("534", "2026-10-29"), { muminId: 534, startDate: "2026-10-29T12:00:00.000Z" });
  assert.throws(() => startThaaliPayload("", "2026-10-29"));
  assert.throws(() => startThaaliPayload(534, "2026-02-30"));
  assert.deepEqual(bulkStartPayload([{ muminId: 534 }, { muminId: 535 }], "2026-10-29"), { action: "Start", muminIds: [534, 535], date: "2026-10-29T12:00:00.000Z" });
  assert.throws(() => bulkStartPayload([], "2026-10-29"));
  assert.throws(() => bulkStartPayload([{ muminId: 534 }, { muminId: 534 }], "2026-10-29"));
});
test("partial bulk success keeps only failed or unconfirmed members selected", () => {
  const selected = [{ muminId: 1 }, { muminId: 2 }, { muminId: 3 }];
  assert.deepEqual(failedBulkMembers(selected, { results: [{ muminId: 1, success: true }, { muminId: 2, success: false, errorCode: "AlreadyTaking" }] }), [{ muminId: 2 }, { muminId: 3 }]);
  assert.deepEqual(failedBulkMembers(selected, { successCount: 3, failedCount: 0 }), []);
});
