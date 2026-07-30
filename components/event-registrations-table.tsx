"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import { ApiCallError } from "@/lib/api-client";
import type { EventRegistration, RegistrationStatus, RegistrationField } from "@/lib/types";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const STATUSES: RegistrationStatus[] = ["PENDING", "CONFIRMED", "WAITLISTED", "CANCELLED"];

export function EventRegistrationsTable({ eventId, fields }: { eventId: string; fields: RegistrationField[] }) {
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

  const name = (r: EventRegistration) =>
    r.athleteProfile?.fullName ?? r.associationProfile?.name ?? r.account?.email ?? "—";
  const memberId = (r: EventRegistration) =>
    r.athleteProfile?.bssaId ?? r.associationProfile?.bssaId ?? "—";

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Registrant</TableHead>
            <TableHead>Member ID</TableHead>
            <TableHead>Type</TableHead>
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
