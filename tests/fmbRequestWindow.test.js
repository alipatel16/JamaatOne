const test = require("node:test");
const assert = require("node:assert/strict");
const { requestWindowPayload, submitThaaliRequest } = require("../src/utils/fmbRequestWindow");
const times = { pauseOpenTime: "11:00", pauseCloseTime: "13:00", resumeOpenTime: "09:00", resumeCloseTime: "12:30" };

test("request window PUT includes only four valid 24-hour HH:mm fields", () => {
  assert.deepEqual(requestWindowPayload({ ...times, jamaatId: 1 }), times);
  for (const value of ["", "24:00", "12:60", "1:00", "11am"]) assert.throws(() => requestWindowPayload({ ...times, pauseOpenTime: value }), /HH:mm/);
  assert.equal(requestWindowPayload({ ...times, pauseOpenTime: "23:00", pauseCloseTime: "01:00" }).pauseCloseTime, "01:00");
});

test("closed pause window blocks the POST even if a previously displayed check was open", async () => {
  const calls = [];
  const api = { getRequestWindow: async () => { calls.push("GET"); return { ...times, pauseOpenNow: false, resumeOpenNow: true, serverTime: "10:00" }; }, createPause: async () => calls.push("POST") };
  await assert.rejects(submitThaaliRequest(api, "PAUSE", {}), /11:00.*13:00/);
  assert.deepEqual(calls, ["GET"]);
});

test("resume checks its own current server window before posting", async () => {
  const calls = [];
  let open = false;
  const api = { getRequestWindow: async () => { calls.push("GET"); return { ...times, pauseOpenNow: true, resumeOpenNow: open }; }, resumePause: async (id, body) => { calls.push([id, body]); return "resumed"; } };
  await assert.rejects(submitThaaliRequest(api, "RESUME", { resumeDate: "2026-10-30" }, 8), /09:00.*12:30/);
  open = true;
  assert.equal(await submitThaaliRequest(api, "RESUME", { resumeDate: "2026-10-30" }, 8), "resumed");
  assert.deepEqual(calls, ["GET", "GET", [8, { resumeDate: "2026-10-30" }]]);
});

test("open pause window posts once; missing settings or failed checks never post", async () => {
  let posted = 0;
  const api = { getRequestWindow: async () => ({ ...times, pauseOpenNow: true }), createPause: async body => { posted++; return body; } };
  assert.deepEqual(await submitThaaliRequest(api, "PAUSE", { reason: "Away" }), { reason: "Away" });
  api.getRequestWindow = async () => null;
  await assert.rejects(submitThaaliRequest(api, "PAUSE", {}), /not.*configured/i);
  api.getRequestWindow = async () => { throw new Error("Window service unavailable"); };
  await assert.rejects(submitThaaliRequest(api, "PAUSE", {}), /unavailable/);
  assert.equal(posted, 1);
});
