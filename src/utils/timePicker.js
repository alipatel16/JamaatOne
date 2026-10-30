function selectedTime(date) { return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }
function timePickerDate(value, now = new Date()) {
  const date = new Date(now);
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) {
    const [hours, minutes] = value.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  }
  return date;
}
module.exports = { selectedTime, timePickerDate };
