"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const STATUSES: RegistrationStatus[] = ["PENDING", "CONFIRMED", "WAITLISTED", "CANCELLED"];

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", "registrations", eventId] });
      toast.success("Updated");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!regs.length) return <p className="py-4 text-sm text-muted-foreground">No registrations yet.</p>;

  // Standard columns the event actually asks for. `fullName` is skipped — the
  // Registrant column already shows it.
  const stdCols = STANDARD_FIELD_ORDER.filter((k) => k !== "fullName" && standardFields[k]?.show);

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

  return (
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
              <TableCell className="font-medium">{name(r)}</TableCell>
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
  );
}
