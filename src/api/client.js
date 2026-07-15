import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { mockApiRequest } from "./mockStore";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.example.com/api";

const MOCK_MODE =
  String(process.env.EXPO_PUBLIC_USE_MOCK_API || "true").toLowerCase() ===
  "true";

const TOKEN_KEY = "jamaat_access_token";

export async function getStoredToken() {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(TOKEN_KEY) || null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function storeToken(token) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  if (MOCK_MODE) return mockApiRequest(path, options);

  const token = await getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  return body;
}
