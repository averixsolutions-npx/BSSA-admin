// Single source of truth for the sessionStorage keys used by the admin app.
// Admin-specific namespace ("bssa-admin:") to keep clear of any BSSA web keys
// if the two ever share an origin.
export const ADMIN_SESSION_KEYS = {
  refreshToken: "bssa-admin:rt", // dies on tab close; survives F5 within the tab
} as const;
