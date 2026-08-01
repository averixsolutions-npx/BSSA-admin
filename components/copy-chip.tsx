"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";

/** Monospace identifier the operator copies constantly — one click, one toast. */
export function CopyChip({
  value,
  label,
  prefix,
  title,
}: {
  value: string;
  /** Used in the toast, e.g. "Member ID copied". */
  label: string;
  prefix?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? `Copy ${label.toLowerCase()}`}
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="inline-flex max-w-full items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs transition-colors hover:bg-muted/70"
    >
      <span className="truncate">{prefix}{value}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-60" />
    </button>
  );
}
