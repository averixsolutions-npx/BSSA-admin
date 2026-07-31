"use client";
import type { StandardFieldsConfig, StandardFieldKey } from "@/lib/types";
import { STANDARD_FIELD_ORDER, STANDARD_FIELD_LABELS, DEFAULT_STANDARD_FIELDS } from "@/lib/registration";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

export function StandardFieldsEditor({
  value,
  onChange,
}: {
  value: StandardFieldsConfig;
  onChange: (v: StandardFieldsConfig) => void;
}) {
  // Fall back to sensible defaults for any key the event hasn't configured yet.
  const cfg: StandardFieldsConfig = { ...DEFAULT_STANDARD_FIELDS, ...value };

  function update(key: StandardFieldKey, patch: Partial<{ show: boolean; required: boolean }>) {
    const current = cfg[key] ?? { show: false, required: false };
    const next = { ...current, ...patch };
    if (!next.show) next.required = false; // can't require a hidden field
    onChange({ ...cfg, [key]: next });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Standard details</p>
      <p className="text-xs text-muted-foreground">
        Auto-filled from each registrant&apos;s profile — they only review and confirm. Tick what to
        ask for and what&apos;s required.
      </p>
      <div className="divide-y rounded-md border">
        {STANDARD_FIELD_ORDER.map((key) => {
          const c = cfg[key] ?? { show: false, required: false };
          return (
            <div key={key} className="flex items-center gap-4 p-2.5">
              <label className="flex flex-1 items-center gap-2 text-sm">
                <Checkbox checked={c.show} onCheckedChange={(v) => update(key, { show: Boolean(v) })} />
                {STANDARD_FIELD_LABELS[key]}
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={c.required}
                  disabled={!c.show}
                  onCheckedChange={(v) => update(key, { required: v })}
                  aria-label={`${STANDARD_FIELD_LABELS[key]} required`}
                />
                Required
              </label>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Athletes also auto-include Member ID, FIS ID and disciplines (read-only). Associations include
        their name and Member ID.
      </p>
    </div>
  );
}
