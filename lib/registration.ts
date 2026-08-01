import type { StandardFieldKey, StandardFieldsConfig, RegistrationFieldType } from "@/lib/types";

export const STANDARD_FIELD_ORDER: StandardFieldKey[] = ["fullName", "email", "phone", "bssaId"];

export const STANDARD_FIELD_LABELS: Record<StandardFieldKey, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Contact number",
  bssaId: "BSSA ID",
};

// Mirror of the backend DEFAULT_STANDARD_FIELDS — the "default form".
export const DEFAULT_STANDARD_FIELDS: StandardFieldsConfig = {
  fullName: { show: true, required: true },
  email: { show: true, required: true },
  phone: { show: true, required: true },
  bssaId: { show: true, required: false }, // read-only, prefilled
};

// Shown but never user-editable — identity values from the profile.
export const READ_ONLY_STANDARD_FIELDS: StandardFieldKey[] = ["bssaId"];

// Keys a custom field may NOT reuse (would shadow a standard/auto value). Mirrors the backend.
export const RESERVED_KEYS: readonly string[] = [...STANDARD_FIELD_ORDER];

// Friendly names shown in the type dropdown.
export const FIELD_TYPE_LABELS: Record<RegistrationFieldType, string> = {
  text: "Short text",
  number: "Number",
  date: "Date",
  checkbox: "Yes / No",
  select: "Dropdown",
};
export const FIELD_TYPE_ORDER: RegistrationFieldType[] = ["text", "number", "date", "checkbox", "select"];

// label → storage key (lowercase, underscores). Capped to 40 to match the backend.
export function slugifyKey(label: string): string {
  return (
    label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) ||
    "field"
  );
}

export function uniqueKey(base: string, taken: string[]): string {
  const set = new Set(taken);
  let k = base;
  let n = 1;
  while (set.has(k) || RESERVED_KEYS.includes(k)) { n += 1; k = `${base}_${n}`; }
  return k;
}

// Quick-add presets — one click drops in a fully-configured field.
export interface FieldPreset {
  label: string;
  type: RegistrationFieldType;
  required?: boolean;
  options?: string[];
  helpText?: string;
}
export const FIELD_PRESETS: FieldPreset[] = [
  { label: "Age Category", type: "select", options: ["U14", "U16", "U18", "U21", "Senior"], required: true },
  { label: "Event / Race", type: "select", options: ["Slalom", "Giant Slalom", "Super-G", "Downhill"] },
  { label: "Seed Time", type: "text" },
  { label: "T-shirt Size", type: "select", options: ["S", "M", "L", "XL", "XXL"] },
  { label: "Emergency Contact", type: "text", required: true },
  { label: "Medically Fit", type: "checkbox", required: true, helpText: "Confirm you are medically fit to compete." },
];
