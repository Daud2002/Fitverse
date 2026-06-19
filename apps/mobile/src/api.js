import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_PORT = 2002;
const LAN_FALLBACK = "172.20.10.10";

function getDevHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length) {
      const host = c.split(":")[0];
      if (host) return host;
    }
  }
  return null;
}

function resolveApiUrl() {
  const configured = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured;

  if (Platform.OS === "web") return `http://localhost:${API_PORT}`;

  const host = getDevHost();
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${API_PORT}`;
  }

  if (Platform.OS === "android") return `http://10.0.2.2:${API_PORT}`;
  return `http://${LAN_FALLBACK}:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

const TOKEN_KEY = "fitverse_token";

export async function getToken() {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(TOKEN_KEY) || null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  if (Platform.OS === "web") {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  console.log(`API URL`, API_URL);
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
