function normalizeBaseUrl(value) {
  const fallback = "https://vibrant-cohen.80-65-208-158.plesk.page";
  const normalized = String(value || fallback).trim().replace(/\/+$/, "");

  // All published endpoint constants already start with /api. Keeping /api in
  // the environment base URL would otherwise produce /api/api/... requests.
  return normalized.replace(/\/api$/i, "");
}

export const API_CONFIG = {
  baseUrl: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL),
  timeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 20000),
  // Modules without a published Swagger endpoint continue using the local mock
  // store. Auth, directory, Mumineen and Accounts payment flows use live APIs.
  mockUnavailableApis:
    String(process.env.EXPO_PUBLIC_MOCK_UNAVAILABLE_APIS || "true").toLowerCase() ===
    "true"
};
