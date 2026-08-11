"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { Download, FileSpreadsheet, FileText, FileType2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AccountStatus } from "@/lib/types";
import { QUEUE_BUCKETS } from "@/components/status-filter-chips";
import { fetchAllAthletesForExport } from "@/lib/services/athletes-export";
import {
  ATHLETE_EXPORT_COLUMNS, DEFAULT_EXPORT_KEYS,
} from "@/lib/export/athlete-columns";
import { toast } from "sonner";

type Format = "xlsx" | "csv" | "pdf";

const ACCOUNT_FILTERS: { key: string; label: string; value: AccountStatus | null }[] = [
  { key: "ANY", label: "Any account status", value: null },
  { key: "ACTIVE", label: "Active only", value: "ACTIVE" },
  { key: "SUSPENDED", label: "Suspended only", value: "SUSPENDED" },
  { key: "BLACKLISTED", label: "Blacklisted only", value: "BLACKLISTED" },
];

const FORMATS: { key: Format; label: string; icon: ReactNode; hint: string }[] = [
  { key: "xlsx", label: "Excel", icon: <FileSpreadsheet className="h-5 w-5" />, hint: ".xlsx spreadsheet" },
  { key: "csv", label: "CSV", icon: <FileType2 className="h-5 w-5" />, hint: "plain .csv" },
  { key: "pdf", label: "PDF", icon: <FileText className="h-5 w-5" />, hint: "printable table" },
];

export function AthletesExportDialog() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("xlsx");
  const [statusKey, setStatusKey] = useState("ALL");
  const [accountKey, setAccountKey] = useState("ANY");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_EXPORT_KEYS);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);

  const toggleCol = (key: string) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const columns = ATHLETE_EXPORT_COLUMNS.filter((c) => selectedKeys.includes(c.key));

  async function handleExport() {
    if (columns.length === 0) {
      toast.error("Pick at least one column to export.");
      return;
    }
    setBusy(true);
    setProgress({ loaded: 0, total: 0 });
    try {
      const statusFilter = QUEUE_BUCKETS.find((s) => s.key === statusKey)!;
      let athletes = await fetchAllAthletesForExport(
        { submissionStatusIn: statusFilter.statuses ?? undefined },
        (loaded, total) => setProgress({ loaded, total })
      );

      // Account-status filter is applied client-side (the list endpoint filters
      // by review status; account status is on the row, so we narrow here).
      const accountFilter = ACCOUNT_FILTERS.find((a) => a.key === accountKey)!;
      if (accountFilter.value) {
        athletes = athletes.filter((a) => a.account?.status === accountFilter.value);
      }

      if (athletes.length === 0) {
        toast.error("No athletes match those filters.");
        return;
      }

      const filterLabel = `${statusFilter.label}${accountFilter.value ? ` · ${accountFilter.label}` : ""}`;

      // Loaded on demand — xlsx/jspdf are heavy and most admins never export,
      // so keeping them out of the athletes page's initial bundle is worth it.
      const { exportExcel, exportCsv, exportPdf } = await import("@/lib/export/generate-files");
      if (format === "xlsx") exportExcel(athletes, columns);
      else if (format === "csv") exportCsv(athletes, columns);
      else exportPdf(athletes, columns, { filterLabel });

      toast.success(`Exported ${athletes.length} athlete(s) as ${format.toUpperCase()}.`);
      setOpen(false);
    } catch (e) {
      toast.error("Export failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export athletes</DialogTitle>
          <DialogDescription>
            Choose a format, filter the records, and pick the columns to include.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Format picker */}
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormat(f.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors",
                    format === f.key
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {f.icon}
                  <span className="text-sm font-medium">{f.label}</span>
                  <span className="text-[10px] text-muted-foreground">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Review-status filter */}
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">Review status</Label>
            <div className="flex flex-wrap gap-2">
              {QUEUE_BUCKETS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatusKey(s.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    statusKey === s.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account-status filter */}
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">Account status</Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_FILTERS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAccountKey(a.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    accountKey === a.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column toggles */}
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">
              Columns ({columns.length} selected)
            </Label>
            <div className="grid max-h-40 grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto rounded-lg border border-border p-3">
              {ATHLETE_EXPORT_COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedKeys.includes(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                  />
                  <span className="text-foreground">{c.header}</span>
                </label>
              ))}
            </div>
          </div>

          {busy && progress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Collecting records… {progress.loaded}
              {progress.total ? ` / ${progress.total}` : ""}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleExport} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? "Exporting…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
