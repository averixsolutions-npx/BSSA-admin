"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import { ApiCallError } from "@/lib/api-client";
import type {
  EventRegistration,
  RegistrationStatus,
  RegistrationField,
  StandardFieldsConfig,
} from "@/lib/types";
import { STANDARD_FIELD_ORDER, STANDARD_FIELD_LABELS } from "@/lib/registration";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// One CSV cell, quoted and with internal quotes escaped.
function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

const STATUSES: RegistrationStatus[] = ["PENDING", "CONFIRMED", "WAITLISTED", "CANCELLED"];

// Public web app base — used to link an athlete row to their profile.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

// A row links out only when it's a published athlete with a slug.
function profileHref(r: EventRegistration): string | null {
  const p = r.athleteProfile;
  if (p?.slug && p.isPublished && SITE_URL) return `${SITE_URL}/athletes/${p.slug}`;
  return null;
}

export function EventRegistrationsTable({
  eventId,
  fields,
  standardFields = {},
}: {
  eventId: string;
  fields: RegistrationField[];
  standardFields?: StandardFieldsConfig;
}) {
  const qc = useQueryClient();
  const { data: regs = [], isLoading } = useQuery({
    queryKey: ["events", "registrations", eventId],
    queryFn: () => eventsService.listRegistrations(eventId),
  });
  const statusM = useMutation({
    mutationFn: ({ regId, status }: { regId: string; status: RegistrationStatus }) =>
      eventsService.setRegistrationStatus(eventId, regId, status),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["events", "registrations", eventId] });
      toast.success(`Marked ${v.status.toLowerCase()}`);
    },
    onError: (e) =>
      toast.error("Couldn't update the registration", {
        description: e instanceof ApiCallError ? e.message : undefined,
      }),
  });

  // fullName is the Registrant column; bssaId is the Member ID column — skip both.
  const stdCols = STANDARD_FIELD_ORDER.filter(
    (k) => k !== "fullName" && k !== "bssaId" && standardFields[k]?.show
  );

  const name = (r: EventRegistration) =>
    r.athleteProfile?.fullName ?? r.associationProfile?.name ?? r.account?.email ?? "—";
  const memberId = (r: EventRegistration) =>
    r.athleteProfile?.bssaId ?? r.associationProfile?.bssaId ?? "—";

  // Values captured from the profile at registration time. DOB is stored as an
  // ISO date — show just the day part.
  const snapshot = (r: EventRegistration, key: string) => {
    const v = r.standardSnapshot?.[key];
    if (v === undefined || v === null || v === "") return "—";
    if (Array.isArray(v)) return v.join(", ");
    if (key === "dob") return String(v).slice(0, 10);
    return String(v);
  };

  const confirmed = regs.filter((r) => r.status === "CONFIRMED").length;

  const handleExport = () => {
    const headers = [
      "Registrant", "Member ID", "Type",
      ...stdCols.map((k) => STANDARD_FIELD_LABELS[k]),
      ...fields.map((f) => f.label),
      "Status",
    ];
    const rows = regs.map((r) => [
      name(r), memberId(r), r.registrantType,
      ...stdCols.map((k) => snapshot(r, k)),
      ...fields.map((f) => String(r.answers?.[f.key] ?? "")),
      r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => csvCell(String(c))).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  return (
    <SectionCard
      title="Registrations"
      description={
        regs.length > 0
          ? `${regs.length} registered · ${confirmed} confirmed`
          : "Who has signed up, and what they answered."
      }
      icon={Users}
      tone="violet"
      action={
        regs.length > 0 ? (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : regs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No registrations yet"
          description="Entries appear here as soon as members register for this event."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registrant</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead>Type</TableHead>
                {stdCols.map((k) => <TableHead key={k}>{STANDARD_FIELD_LABELS[k]}</TableHead>)}
                {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {(() => {
                      const href = profileHref(r);
                      if (href) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
                            title="Open public profile in a new tab"
                          >
                            {name(r)}
                            <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                          </a>
                        );
                      }
                      // No dead end — say why there's no link.
                      const reason =
                        r.registrantType === "ASSOCIATION"
                          ? "No public profile"
                          : r.athleteProfile && !r.athleteProfile.isPublished
                          ? "Profile not public yet"
                          : null;
                      return (
                        <span className="inline-flex items-center gap-2">
                          {name(r)}
                          {reason && (
                            <span className="text-[11px] font-normal text-muted-foreground">({reason})</span>
                          )}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{memberId(r)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.registrantType}</TableCell>
                  {stdCols.map((k) => (
                    <TableCell key={k} className="text-xs">{snapshot(r, k)}</TableCell>
                  ))}
                  {fields.map((f) => (
                    <TableCell key={f.key} className="text-xs">{String(r.answers?.[f.key] ?? "—")}</TableCell>
                  ))}
                  <TableCell>
                    <Select
                      value={r.status}
                      onValueChange={(v) => statusM.mutate({ regId: r.id, status: v as RegistrationStatus })}
                    >
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}
