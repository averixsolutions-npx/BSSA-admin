"use client";
import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder,
  allowCustom = true,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  const showAddCustom =
    allowCustom && query.trim() !== "" && !options.some((o) => o.toLowerCase() === q);

  const commit = (val: string) => { onChange(val); setQuery(""); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={open ? query : value}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (allowCustom) onChange(e.target.value); // free text mirrors immediately
          }}
        />
        <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.length === 0 && !showAddCustom && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No matches</p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => commit(opt)}
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {opt}
              {value === opt && <Check className="h-4 w-4" />}
            </button>
          ))}
          {showAddCustom && (
            <button
              type="button"
              onClick={() => commit(query.trim())}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Use "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
