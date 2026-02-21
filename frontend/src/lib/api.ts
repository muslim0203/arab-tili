import { useAuthStore } from "@/store/auth";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function refreshAccess(): Promise<string | null> {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
  if (!refreshToken) return null;
  const res = await fetch(`${BASE}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    logout();
    return null;
  }
  const data = await res.json();
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export type RequestConfig = Omit<RequestInit, "body"> & { body?: BodyInit | object | null; skipAuth?: boolean };

export async function api<T = unknown>(path: string, config: RequestConfig = {}): Promise<T> {
  const { skipAuth, ...init } = config;
  const url = path.startsWith("http") ? path : `${BASE}${path}`;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let body = init.body;
    if (body != null && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }
    return fetch(url, { ...init, headers, body });
  };

  let token = skipAuth ? null : useAuthStore.getState().accessToken;
  let res = await doFetch(token);

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccess();
    if (newToken) res = await doFetch(newToken);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) return res.json() as Promise<T>;
  return res.text() as Promise<T>;
}
