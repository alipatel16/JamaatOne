const ALADHAN_BASE_URL = "https://api.aladhan.com/v1";

const pad = value => String(value).padStart(2, "0");

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  const body = await response.json();
  if (!response.ok || body?.code !== 200) {
    throw new Error(body?.data || body?.status || "Unable to load Islamic data.");
  }
  return body.data;
}

export function toApiDate(date) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export async function getHijriForGregorian(date = new Date()) {
  return fetchJson(`${ALADHAN_BASE_URL}/gToH/${toApiDate(date)}`);
}

export async function getHijriMonth(month, year) {
  return fetchJson(`${ALADHAN_BASE_URL}/hToGCalendar/${month}/${year}`);
}

export async function getPrayerTimes({ latitude, longitude, date }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    method: "1",
    school: "1"
  });

  return fetchJson(
    `${ALADHAN_BASE_URL}/timings/${toApiDate(date)}?${params.toString()}`
  );
}

export async function getPrayerCalendar({ latitude, longitude, year, month }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    method: "1",
    school: "1"
  });

  return fetchJson(
    `${ALADHAN_BASE_URL}/calendar/${year}/${month}?${params.toString()}`
  );
}

export function cleanPrayerTime(value) {
  return String(value || "--:--")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();
}
