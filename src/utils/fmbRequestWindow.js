const TIME_FIELDS = ["pauseOpenTime", "pauseCloseTime", "resumeOpenTime", "resumeCloseTime"];
const validTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function requestWindowPayload(form) {
  const body = {};
  for (const key of TIME_FIELDS) {
    const value = String(form[key] || "").trim();
    if (!validTime(value)) throw new Error("Enter all four times in 24-hour HH:mm format (for example, 11:00 or 13:00).");
    body[key] = value;
  }
  return body;
}

async function submitThaaliRequest(api, kind, body, pauseId) {
  if (kind !== "PAUSE" && kind !== "RESUME") throw new Error("Choose a pause or resume request.");
  // Ask the server at submission time: its clock, timezone and inclusive close
  // boundary are authoritative, including windows that cross midnight.
  const window = await api.getRequestWindow();
  const prefix = kind === "PAUSE" ? "pause" : "resume";
  const open = window?.[`${prefix}OpenTime`];
  const close = window?.[`${prefix}CloseTime`];
  if (!open || !close) throw new Error("Request times are not configured. Contact your FMB Admin or Aamil.");
  if (window[`${prefix}OpenNow`] !== true) throw new Error(`${kind === "PAUSE" ? "Pause" : "Resume"} requests are closed now. Allowed time: ${open}–${close} (Jamaat server time).`);
  return kind === "PAUSE" ? api.createPause(body) : api.resumePause(pauseId, body);
}

module.exports = { requestWindowPayload, submitThaaliRequest };
