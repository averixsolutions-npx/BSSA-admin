"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, X, User, Building2, Check } from "lucide-react";

import { eventsService } from "@/lib/services/events";
import type { MemberSearchResult } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TagValue {
  athleteProfileId?: string;
  associationProfileId?: string;
  label?: string;        // name of the tagged member, for display
}

/**
 * Type-to-search picker that tags a result to any existing member.
 * Handles every state: <2 chars, searching, no results, error, and tagged.
 */
export function MemberTagCombobox({
  value, onChange, size = "md",
}: {
  value: TagValue;
  onChange: (next: TagValue | null, member?: MemberSearchResult) => void;
  size?: "sm" | "md";
}) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const enabled = debounced.length >= 2;
  const { data: results = [], isFetching, isError } = useQuery({
    queryKey: ["member-search", debounced],
    queryFn: () => eventsService.searchMembers(debounced),
    enabled,
    staleTime: 30_000,
  });

  const tagged = Boolean(value.athleteProfileId || value.associationProfileId);
  const sm = size === "sm";

  if (tagged) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-md border bg-muted/40 px-2.5",
        sm ? "h-7 text-[11px]" : "h-10 text-sm"
      )}>
        <Check className={cn("shrink-0 text-emerald-600", sm ? "h-3 w-3" : "h-4 w-4")} />
        <span className="min-w-0 flex-1 truncate">
          Tagged: <span className="font-medium">{value.label ?? "member"}</span>
        </span>
        <button
          type="button" aria-label="Remove tag"
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => onChange(null)}
        >
          <X className={sm ? "h-3 w-3" : "h-4 w-4"} />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", sm ? "text-[11px]" : "text-sm")} ref={ref}>
      <div className="relative">
        <Search className={cn(
          "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
          sm ? "h-3 w-3" : "h-4 w-4"
        )} />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search name or BSSA ID to tag…"
          className={cn("pl-8", sm ? "h-7 text-[11px]" : "h-10")}
        />
        {enabled && isFetching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] overflow-hidden rounded-md border bg-popover shadow-md animate-in fade-in-0 zoom-in-95">
          {!enabled ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">Type at least 2 characters.</p>
          ) : isError ? (
            <p className="px-3 py-2.5 text-xs text-destructive">Couldn&apos;t search right now. Try again.</p>
          ) : isFetching && results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">No members match &ldquo;{debounced}&rdquo;.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((m) => (
                <li key={`${m.type}-${m.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent"
                    onClick={() => {
                      onChange(
                        m.type === "ATHLETE"
                          ? { athleteProfileId: m.id, label: m.name }
                          : { associationProfileId: m.id, label: m.name },
                        m
                      );
                      setQuery(""); setOpen(false);
                    }}
                  >
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      m.type === "ATHLETE" ? "bg-blue-500/10 text-blue-600" : "bg-violet-500/10 text-violet-600"
                    )}>
                      {m.type === "ATHLETE" ? <User className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {m.bssaId ?? "No BSSA ID"} · {m.state ?? "—"}
                      </span>
                    </span>
                    {m.type === "ATHLETE" && !m.isPublished && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">Not public</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
