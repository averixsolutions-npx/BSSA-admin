"use client";
import { create } from "zustand";
import { api, registerAuthAdapter, ApiCallError } from "./api-client";
import { ADMIN_SESSION_KEYS } from "./session-keys";
import type { AdminAccount } from "./types";

// Local SSR-safe helpers — kept here rather than in api-client because
// auth-store is the source-of-truth for what "logged in" means and it also
// needs to clear the token on logout / unauthenticated events.
function readRt(): string | null {
  if (typeof window === "undefined") return null;
  try { return sessionStorage.getItem(ADMIN_SESSION_KEYS.refreshToken); } catch { return null; }
}
function writeRt(rt: string): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(ADMIN_SESSION_KEYS.refreshToken, rt); } catch { /* ignore */ }
}
function clearRt(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(ADMIN_SESSION_KEYS.refreshToken); } catch { /* ignore */ }
}

interface AuthState {
  admin: AdminAccount | null;
  accessToken: string | null;
  isBooting: boolean;      // true during initial cookie-check on mount
  isAuthenticated: boolean;

  setAccessToken: (t: string | null) => void;
  boot: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  accessToken: null,
  isBooting: true,
  isAuthenticated: false,

  setAccessToken: (t) => set({ accessToken: t, isAuthenticated: !!t }),

  // Called once on app mount (from <AuthGuard> and the login page). Attempts
  // to refresh the access token using the refresh token in sessionStorage.
  // If there's no token or the token is dead, the admin lands unauthenticated
  // and gets bounced to /login by <AuthGuard>.
  boot: async () => {
    const rt = readRt();
    if (!rt) {
      set({ isBooting: false });
      return;
    }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/auth/token/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        }
      );
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          // Persist rotated refresh token BEFORE flipping isAuthenticated,
          // so any component rendering off isAuthenticated can trust that
          // subsequent refreshes will succeed.
          writeRt(body.data.refreshToken);
          set({
            accessToken: body.data.accessToken,
            isAuthenticated: true,
            admin: { id: "unknown", username: "admin" },
            // Same placeholder as before — the login flow populates the full
            // AdminAccount record. Boot only gives us tokens.
          });
        } else {
          clearRt();
        }
      } else {
        // Server rejected the token — clear it so we don't retry.
        clearRt();
      }
    } catch {
      // Network error — keep the token in case it's a blip.
    } finally {
      set({ isBooting: false });
    }
  },

  login: async (username, password) => {
    const data = await api.login<{
      admin: AdminAccount;
      accessToken: string;
      refreshToken: string;
      refreshExpiresAt: string;
    }>({ username, password });
    writeRt(data.refreshToken);
    set({
      admin: data.admin,
      accessToken: data.accessToken,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await api.logout(); // api.logout() reads the RT from sessionStorage internally
    } catch (err) {
      // Log but don't throw — we still clear local state
      if (!(err instanceof ApiCallError)) throw err;
    }
    clearRt();
    set({
      admin: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));

// ─── Wire the store into the API client at module-load time ──

// This runs once when this module is first imported. It gives the API
// client a way to read the current token and clear it on refresh failure.
registerAuthAdapter({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (t) => useAuthStore.getState().setAccessToken(t),
  onUnauthenticated: () => {
    clearRt();
    useAuthStore.setState({
      admin: null,
      accessToken: null,
      isAuthenticated: false,
    });
    // If we're not already on the login page, redirect
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  },
});
