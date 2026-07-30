// Single source of truth for org naming in the admin UI.
// Set NEXT_PUBLIC_ORG_NAME in .env.local to the full form.
export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME ?? "BSSA";
export const ORG_SHORT = process.env.NEXT_PUBLIC_ORG_SHORT ?? "BSSA";
