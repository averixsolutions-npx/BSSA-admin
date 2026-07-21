import { AlertTriangle } from "lucide-react";

type Row = { label: string; before: string | null; after: string | null };

interface Props {
  rows: Row[];
  snapshotAt: string | null;
}

export function PendingChangesBanner({ rows, snapshotAt }: Props) {
  const changed = rows.filter((r) => (r.before ?? "") !== (r.after ?? ""));
  if (changed.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4" />
        {changed.length} field{changed.length > 1 ? "s" : ""} changed since last approval
        {snapshotAt && (
          <span className="ml-auto text-xs font-normal text-amber-700/70 dark:text-amber-400/70">
            Snapshot from {new Date(snapshotAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">
        The public site is still showing the last-approved values. Approve or reject these changes.
      </p>
      <div className="divide-y divide-amber-500/20">
        {changed.map((r) => (
          <div key={r.label} className="flex flex-wrap items-baseline gap-x-4 py-2 text-sm">
            <span className="w-32 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{r.label}</span>
            <span className="text-red-700 line-through dark:text-red-400">{r.before ?? "—"}</span>
            <span className="text-emerald-700 dark:text-emerald-400">→ {r.after ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
