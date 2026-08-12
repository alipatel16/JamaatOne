import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { API_CONFIG } from "./apiConfig";
import { liveEndpoints, isPublishedApiPath } from "./endpoints";
import { mockApiRequest } from "./mockStore";

const SESSION_KEY = "jamaatone_auth_session";
const LEGACY_TOKEN_KEY = "jamaat_access_token";

let refreshPromise = null;
let sessionExpiredHandler = null;
let sessionUpdatedHandler = null;

export class ApiClientError extends Error {
  constructor(message, options = {}) {
    super(message || "Something went wrong while contacting the API.");
    this.name = "ApiClientError";
    this.status = options.status || 0;
    this.code = options.code || null;
    this.apiMessage = options.apiMessage || message || null;
    this.details = options.details || null;
  }
}

function getWebStorage() {
  try {
    // Keep web sessions scoped to the current browser tab/session instead of
    // persisting bearer credentials indefinitely in localStorage.
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

function getLegacyWebStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

async function readStorage(key) {
  if (Platform.OS === "web") {
    const storage = getWebStorage();
    const current = storage?.getItem(key) || null;
    if (current) return current;

    // One-time migration from older builds that persisted the session in
    // localStorage. Move it to sessionStorage and remove the persistent copy.
    const legacyStorage = getLegacyWebStorage();
    const legacy = legacyStorage?.getItem(key) || null;
    if (legacy) {
      storage?.setItem(key, legacy);
      legacyStorage?.removeItem(key);
      return legacy;
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function writeStorage(key, value) {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(key, value);
    getLegacyWebStorage()?.removeItem(key);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeStorage(key) {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(key);
    getLegacyWebStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function isValidDate(value) {
  if (!value) return false;
  return Number.isFinite(new Date(value).getTime());
}

function expiryFromDuration(amount, unitMs, receivedAt) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
  return new Date(receivedAt + numericAmount * unitMs).toISOString();
}

function normalizeSession(session, previousSession = null) {
  const receivedAt = Date.now();
  const merged = { ...(previousSession || {}), ...(session || {}) };

  const accessTokenExpiresAt = isValidDate(session?.accessTokenExpiresAt)
    ? session.accessTokenExpiresAt
    : expiryFromDuration(
        session?.accessTokenExpiresInMinutes,
        60 * 1000,
        receivedAt
      ) || merged.accessTokenExpiresAt || null;

  const refreshTokenExpiresAt = isValidDate(session?.refreshTokenExpiresAt)
    ? session.refreshTokenExpiresAt
    : expiryFromDuration(
        session?.refreshTokenExpiresInDays,
        24 * 60 * 60 * 1000,
        receivedAt
      ) || merged.refreshTokenExpiresAt || null;

  return {
    ...merged,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    sessionReceivedAt: new Date(receivedAt).toISOString()
  };
}

export async function getStoredSession() {
  const raw = await readStorage(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    await clearSession();
    return null;
  }
}

export async function storeSession(session) {
  if (!session?.accessToken || !session?.refreshToken) {
    throw new ApiClientError("The API did not return a complete login session.");
  }

  const currentSession = await getStoredSession();
  const normalized = normalizeSession(session, currentSession);
  await writeStorage(SESSION_KEY, JSON.stringify(normalized));
  await removeStorage(LEGACY_TOKEN_KEY);
  try {
    await sessionUpdatedHandler?.(normalized);
  } catch {
    // Session observers must not prevent token persistence.
  }
  return normalized;
}

export async function clearSession() {
  await Promise.all([
    removeStorage(SESSION_KEY),
    removeStorage(LEGACY_TOKEN_KEY)
  ]);
  try {
    await sessionUpdatedHandler?.(null);
  } catch {
    // Session observers must not prevent local cleanup.
  }
}

export async function getStoredToken() {
  return (await getStoredSession())?.accessToken || null;
}

export async function storeToken(token) {
  const current = (await getStoredSession()) || {};
  await writeStorage(
    SESSION_KEY,
    JSON.stringify({ ...current, accessToken: token })
  );
}

export const clearToken = clearSession;

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = typeof handler === "function" ? handler : null;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
}

export function setSessionUpdatedHandler(handler) {
  sessionUpdatedHandler = typeof handler === "function" ? handler : null;
  return () => {
    if (sessionUpdatedHandler === handler) sessionUpdatedHandler = null;
  };
}

function dateHasExpired(value) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return timestamp <= Date.now();
}

export function getAccessTokenRemainingMs(session) {
  const timestamp = new Date(session?.accessTokenExpiresAt || "").getTime();
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
}

export function getRefreshTokenRemainingMs(session) {
  const timestamp = new Date(session?.refreshTokenExpiresAt || "").getTime();
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
}

function combineUrl(path) {
  const baseUrl = API_CONFIG.baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function serializeBody(body) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body == null || typeof body === "string" || isFormData) {
    return body;
  }
  return JSON.stringify(body);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getEnvelopeStatus(response, body) {
  const bodyStatus = Number(body?.statusCode);
  return Number.isFinite(bodyStatus) && bodyStatus > 0
    ? bodyStatus
    : response.status;
}

function createResponseError(response, body) {
  const status = getEnvelopeStatus(response, body);
  const errorPayload = body?.error;
  const message =
    errorPayload?.message ||
    body?.message ||
    body?.title ||
    (typeof body === "string" ? body : null) ||
    `Request failed with status ${status || response.status}`;

  return new ApiClientError(message, {
    status,
    code: errorPayload?.code || null,
    apiMessage: body?.message || null,
    details: body
  });
}

async function performFetch(path, options = {}, accessToken = null) {
  const { timeoutMs = API_CONFIG.timeoutMs, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body = serializeBody(fetchOptions.body);
  const hasBody = body != null;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  try {
    const response = await fetch(combineUrl(path), {
      ...fetchOptions,
      ...(Platform.OS === "web"
        ? {
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer"
          }
        : {}),
      body,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...fetchOptions.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    });

    const parsedBody = await parseResponse(response);
    return { response, body: parsedBody };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiClientError(
        `The API request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try again.`
      );
    }
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError(
      error?.message || "Unable to connect to the JamaatOne API.",
      { details: error }
    );
  } finally {
    clearTimeout(timeout);
  }
}

function unwrapApiResponse(response, body, returnEnvelope = false) {
  const status = getEnvelopeStatus(response, body);
  const failedHttp = !response.ok;
  const failedEnvelope =
    body && typeof body === "object" && body.success === false;

  if (failedHttp || failedEnvelope || status >= 400) {
    throw createResponseError(response, body);
  }

  if (returnEnvelope) return body;

  if (
    body &&
    typeof body === "object" &&
    Object.prototype.hasOwnProperty.call(body, "data")
  ) {
    return body.data;
  }

  return body;
}

async function expireSession() {
  await clearSession();
  try {
    await sessionExpiredHandler?.();
  } catch {
    // A navigation callback must not hide the original authentication error.
  }
}

async function requestRefreshToken() {
  const currentSession = await getStoredSession();
  if (!currentSession?.refreshToken) {
    await expireSession();
    throw new ApiClientError("Your session has expired. Please sign in again.", {
      status: 401
    });
  }

  if (dateHasExpired(currentSession.refreshTokenExpiresAt)) {
    await expireSession();
    throw new ApiClientError("Your session has expired. Please sign in again.", {
      status: 401
    });
  }

  try {
    const { response, body } = await performFetch(
      liveEndpoints.auth.refreshToken,
      {
        method: "POST",
        body: { refreshToken: currentSession.refreshToken }
      },
      null
    );

    const refreshed = unwrapApiResponse(response, body);
    return await storeSession({ ...currentSession, ...refreshed });
  } catch (error) {
    // The refresh request is the final recovery attempt. Any failure ends the
    // local session and lets AuthContext redirect the user to the login page.
    await expireSession();
    throw error;
  }
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = requestRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function restoreSession() {
  const session = await getStoredSession();
  if (!session?.accessToken || !session?.refreshToken) return null;

  if (dateHasExpired(session.refreshTokenExpiresAt)) {
    await clearSession();
    return null;
  }

  // Do not refresh proactively. The API remains the source of truth: when a
  // protected request returns 401, that failed request triggers refresh and is
  // retried once with the new access token.
  return session;
}

export async function liveApiRequest(path, options = {}) {
  const {
    skipAuth = false,
    skipRefresh = false,
    returnEnvelope = false,
    ...fetchOptions
  } = options;

  const session = skipAuth ? null : await getStoredSession();
  if (!skipAuth && !session?.accessToken) {
    await expireSession();
    throw new ApiClientError("Please sign in to continue.", { status: 401 });
  }

  const { response, body } = await performFetch(
    path,
    fetchOptions,
    session?.accessToken || null
  );
  const status = getEnvelopeStatus(response, body);

  if (
    status === 401 &&
    !skipAuth &&
    !skipRefresh &&
    path !== liveEndpoints.auth.refreshToken
  ) {
    const refreshedSession = await refreshSession();
    const retry = await performFetch(
      path,
      fetchOptions,
      refreshedSession.accessToken
    );

    try {
      return unwrapApiResponse(retry.response, retry.body, returnEnvelope);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        await expireSession();
      }
      throw error;
    }
  }

  return unwrapApiResponse(response, body, returnEnvelope);
}

export async function apiRequest(path, options = {}) {
  if (isPublishedApiPath(path)) {
    return liveApiRequest(path, options);
  }

  if (API_CONFIG.mockUnavailableApis) {
    return mockApiRequest(path, options);
  }

  throw new ApiClientError(
    "This feature is not available in the current server configuration."
  );
}

export class ApiClient {
  request(path, options = {}) {
    return apiRequest(path, options);
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: "GET" });
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: "POST", body });
  }

  put(path, body, options = {}) {
    return this.request(path, { ...options, method: "PUT", body });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
