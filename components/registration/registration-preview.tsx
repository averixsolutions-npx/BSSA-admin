"use client";
import type { StandardFieldsConfig } from "@/lib/types";
import type { RegistrationFieldValue } from "@/app/(app)/events/event-schema";
import { STANDARD_FIELD_ORDER, STANDARD_FIELD_LABELS, DEFAULT_STANDARD_FIELDS } from "@/lib/registration";

export function RegistrationPreview({
  standardFields,
  fields,
}: {
  standardFields: StandardFieldsConfig;
  fields: RegistrationFieldValue[];
}) {
  const cfg = { ...DEFAULT_STANDARD_FIELDS, ...standardFields };
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Preview — what the athlete sees
      </p>
      <div className="space-y-3">
        {STANDARD_FIELD_ORDER.filter((k) => cfg[k]?.show).map((k) => (
          <div key={k}>
            <label className="block text-[11px] uppercase text-muted-foreground">
              {STANDARD_FIELD_LABELS[k]}{cfg[k]?.required && " *"}
            </label>
            <div className="mt-1 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              From your profile
            </div>
          </div>
        ))}

        {fields.map((f, i) => (
          <div key={f.key || i}>
            <label className="block text-[11px] uppercase text-muted-foreground">
              {f.label || "Untitled"}{f.required && " *"}
            </label>
            {f.type === "select" ? (
              <select disabled className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option>{(f.options ?? [])[0] ?? "Select…"}</option>
              </select>
            ) : f.type === "checkbox" ? (
              <input type="checkbox" disabled className="mt-1" />
            ) : (
              <input
                disabled
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            )}
            {f.helpText && <p className="mt-1 text-[11px] text-muted-foreground">{f.helpText}</p>}
          </div>
        ))}

        {STANDARD_FIELD_ORDER.every((k) => !cfg[k]?.show) && fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing to show yet — enable some fields above.</p>
        )}
      </div>
    </div>
  );
}
