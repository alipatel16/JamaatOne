import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { mockApiRequest } from "./mockStore";
import { API_CONFIG } from "./apiConfig";

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
  if (API_CONFIG.useMock) {
    return mockApiRequest(path, options);
  }

  const token = await getStoredToken();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    API_CONFIG.timeoutMs
  );

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const body = isJson ? await response.json() : null;

    if (!response.ok) {
      throw new Error(
        body?.message ||
          body?.title ||
          `Request failed with status ${response.status}`
      );
    }

    return body;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The API request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
