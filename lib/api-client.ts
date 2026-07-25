import type { ApiResponse, ApiError } from "./types";
import { ADMIN_SESSION_KEYS } from "./session-keys";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ─── Custom error thrown for any non-2xx response ─────

export class ApiCallError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;

  constructor(status: number, err: ApiError["error"]) {
    super(err.message);
    this.name = "ApiCallError";
    this.status = status;
    this.code = err.code;
    this.details = err.details;
  }
}

// ─── Auth token access ────────────────────────────────
// We need to read the token from the auth store, but the auth store is a
// React hook. To avoid circular imports and to allow calling the API from
// non-component code, we set up a getter/setter that the auth store
// registers itself into.

let getAccessToken: () => string | null = () => null;
let onUnauthenticated: () => void = () => {};

export function registerAuthAdapter(opts: {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  onUnauthenticated: () => void;
}) {
  getAccessToken = opts.getAccessToken;
  onUnauthenticated = opts.onUnauthenticated;
  refreshHandler = async () => {
    const newToken = await performRefresh();
    if (newToken) {
      opts.setAccessToken(newToken);
      return newToken;
    }
    opts.setAccessToken(null);
    return null;
  };
}

// ─── Refresh flow ─────────────────────────────────────
// If multiple requests fail 401 simultaneously we don't want N parallel
// refresh calls. This latch collapses them into one.

let refreshHandler: (() => Promise<string | null>) = async () => null;
let inFlightRefresh: Promise<string | null> | null = null;

// SSR-safe sessionStorage helpers — hoisted here so both performRefresh and
// api.logout can read/write the same token without exporting internals.
function readAdminRt(): string | null {
  if (typeof window === "undefined") return null;
  try { return sessionStorage.getItem(ADMIN_SESSION_KEYS.refreshToken); } catch { return null; }
}
function writeAdminRt(rt: string): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(ADMIN_SESSION_KEYS.refreshToken, rt); } catch { /* ignore */ }
}
function clearAdminRt(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(ADMIN_SESSION_KEYS.refreshToken); } catch { /* ignore */ }
}

async function performRefresh(): Promise<string | null> {
  const rt = readAdminRt();
  if (!rt) return null; // nothing to refresh with — treat as anonymous
  try {
    const res = await fetch(`${API_URL}/admin/auth/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      // Server rejected the token (invalid / revoked / expired). Purge it so
      // we don't keep offering the same dead token on every call.
      clearAdminRt();
      return null;
    }
    const body = (await res.json()) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
      refreshExpiresAt: string;
    }>;
    if (!body.success) {
      clearAdminRt();
      return null;
    }
    // Persist the rotated refresh token so the NEXT refresh call has fresh state.
    writeAdminRt(body.data.refreshToken);
    return body.data.accessToken;
  } catch {
    return null;
  }
}

async function getRefreshedToken(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshHandler().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

// ─── Core fetch wrapper ───────────────────────────────

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;   // for login endpoint itself
  skipRefresh?: boolean; // internal: prevents refresh loops
  responseType?: "json" | "text";
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function coreFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!opts.skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  // Handle 401 — attempt one refresh, retry once
  if (res.status === 401 && !opts.skipRefresh && !opts.skipAuth) {
    const newToken = await getRefreshedToken();
    if (newToken) {
      return coreFetch<T>(path, { ...opts, skipRefresh: true });
    }
    onUnauthenticated();
    // fall through to error handling below
  }

  // Handle CSV / plain text responses (newsletter export)
  if (opts.responseType === "text") {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiCallError(res.status, {
        code: "INTERNAL_ERROR",
        message: text || res.statusText,
      });
    }
    return (await res.text()) as T;
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body) {
    throw new ApiCallError(res.status, {
      code: "INTERNAL_ERROR",
      message: `Unexpected response (${res.status})`,
    });
  }

  if (!body.success) {
    throw new ApiCallError(res.status, body.error);
  }

  return body.data;
}

// ─── Public API ───────────────────────────────────────

export const api = {
  get<T>(path: string, query?: RequestOptions["query"]) {
    return coreFetch<T>(path, { method: "GET", query });
  },
  post<T>(path: string, body?: unknown) {
    return coreFetch<T>(path, { method: "POST", body });
  },
  patch<T>(path: string, body?: unknown) {
    return coreFetch<T>(path, { method: "PATCH", body });
  },
  put<T>(path: string, body?: unknown) {
    return coreFetch<T>(path, { method: "PUT", body });
  },
  delete<T = void>(path: string) {
    return coreFetch<T>(path, { method: "DELETE" });
  },
  // Special: login uses skipAuth (no token to send yet)
  login<T>(body: unknown) {
    return coreFetch<T>("/admin/auth/login", { method: "POST", body, skipAuth: true });
  },
  logout() {
    const rt = readAdminRt();
    return coreFetch<void>("/admin/auth/logout", {
      method: "POST",
      body: rt ? { refreshToken: rt } : undefined,
    });
  },
  // Special: fetch CSV as text (newsletter export)
  getText(path: string) {
    return coreFetch<string>(path, { method: "GET", responseType: "text" });
  },
};

// Also expose for pagination result parsing
export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// Helper for endpoints that return both data + meta from the envelope
export async function getPaginated<T>(
  path: string,
  query?: RequestOptions["query"]
): Promise<PaginatedResult<T>> {
  const res = await fetch(buildUrl(path, query), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
  });

  if (res.status === 401) {
    const newToken = await getRefreshedToken();
    if (newToken) return getPaginated<T>(path, query);
    onUnauthenticated();
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T[]> | null;
  if (!body || !body.success) {
    throw new ApiCallError(res.status, body?.success === false ? body.error : {
      code: "INTERNAL_ERROR",
      message: `Unexpected response (${res.status})`,
    });
  }

  return {
    items: body.data,
    meta: {
      page: body.meta?.page ?? 1,
      limit: body.meta?.limit ?? 20,
      total: body.meta?.total ?? body.data.length,
      totalPages: body.meta?.totalPages ?? 1,
    },
  };
}
