"use client";
import { create } from "zustand";
import { api, registerAuthAdapter, ApiCallError } from "./api-client";
import type { AdminAccount } from "./types";

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

  // Called once on app mount. Attempts to refresh the token using the cookie.
  // If it works, the admin is logged in from a previous session.
  boot: async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/auth/token/refresh`,
        { method: "POST", credentials: "include" }
      );
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          set({
            accessToken: body.data.accessToken,
            isAuthenticated: true,
          });
          // We don't have admin details from the refresh endpoint. In a
          // real app you'd fetch /admin/me here. For Phase 1 we set a
          // placeholder — the login flow populates the full record.
          set({ admin: { id: "unknown", username: "admin" } });
        }
      }
    } catch {
      // No valid refresh cookie — user needs to log in
    } finally {
      set({ isBooting: false });
    }
  },

  login: async (username, password) => {
    const data = await api.login<{ admin: AdminAccount; accessToken: string }>({
      username,
      password,
    });
    set({
      admin: data.admin,
      accessToken: data.accessToken,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      // Log but don't throw — we still clear local state
      if (!(err instanceof ApiCallError)) throw err;
    }
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
