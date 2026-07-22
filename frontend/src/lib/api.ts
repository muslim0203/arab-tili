import { useAuthStore } from "@/store/auth";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return "/api";
  if (typeof window === "undefined") return raw;
  try {
    const target = new URL(raw, window.location.origin);
    const appIsLocal = isLocalHostname(window.location.hostname);
    const targetIsLocal = isLocalHostname(target.hostname);
    // Production domenida turib localhost API'ga urilib qolmaslik uchun fallback.
    if (!appIsLocal && targetIsLocal) return "/api";
  } catch {
    return "/api";
  }
  return raw;
}

const BASE = resolveApiBase();

// Bir vaqtning o'zida bir nechta 401 kelganda faqat bitta refresh so'rovi yuboriladi.
let refreshInFlight: Promise<string | null> | null = null;

function redirectToLogin() {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?next=${next}`);
  }
}

async function refreshAccess(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
    try {
      // Refresh token asosan httpOnly cookie'da (credentials: "include" bilan yuboriladi).
      // Xotirada eski token bo'lsa, fallback sifatida body'da ham yuboramiz.
      const res = await fetch(`${BASE}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      if (!res.ok) {
        logout();
        redirectToLogin();
        return null;
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      return data.accessToken as string;
    } catch {
      logout();
      redirectToLogin();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
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
    // credentials: "include" — login/register'da server httpOnly refresh cookie o'rnatadi.
    return fetch(url, { ...init, headers, body, credentials: "include" });
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
