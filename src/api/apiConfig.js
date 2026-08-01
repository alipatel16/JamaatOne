export const API_CONFIG = {
  useMock:
    String(process.env.EXPO_PUBLIC_USE_MOCK_API || "true").toLowerCase() ===
    "true",
  baseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.example.com/api",
  timeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 20000)
};
