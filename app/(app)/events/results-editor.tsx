"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Save, X, Link2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import type { EventResult, EventRegistration } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

const resultSchema = z.object({
  rank: z.coerce.number().int().positive("Rank must be positive"),
  athleteOrTeam: z.string().trim().min(1, "Name required"),
  state: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().optional().or(z.literal("")),
  resultValue: z.string().trim().min(1, "Result required"),
  timing: z.string().trim().optional().or(z.literal("")),
  remarks: z.string().trim().optional().or(z.literal("")),
  athleteProfileId: z.string().optional().or(z.literal("")),
  associationProfileId: z.string().optional().or(z.literal("")),
});

type ResultFormValues = z.infer<typeof resultSchema>;

// Empty strings mean "not set" in the form; the API wants them omitted.
function toResultInput(input: ResultFormValues) {
  return {
    rank: input.rank,
    athleteOrTeam: input.athleteOrTeam,
    resultValue: input.resultValue,
    state: input.state || undefined,
    category: input.category || undefined,
    timing: input.timing || undefined,
    remarks: input.remarks || undefined,
    athleteProfileId: input.athleteProfileId || undefined,
    associationProfileId: input.associationProfileId || undefined,
  };
}

const registrantName = (r: EventRegistration) =>
  r.athleteProfile?.fullName ?? r.associationProfile?.name ?? r.account?.email ?? "Registrant";

interface ResultsEditorProps {
  eventId: string;
}

export function ResultsEditor({ eventId }: ResultsEditorProps) {
  const queryClient = useQueryClient();
  const queryKey = ["events", "results", eventId];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EventResult | null>(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => eventsService.listResults(eventId),
  });

  // Confirmed registrants can be tagged onto a result. Registration may be off
  // for this event — in that case we just don't offer the picker.
  const { data: registrations } = useQuery({
    queryKey: ["events", "registrations", eventId],
    queryFn: () => eventsService.listRegistrations(eventId),
    retry: false,
  });
  const registrants = (registrations ?? []).filter((r) => r.status === "CONFIRMED");

  const createMutation = useMutation({
    mutationFn: (input: ResultFormValues) => eventsService.createResult(eventId, toResultInput(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Result added");
      setShowAddDialog(false);
    },
    onError: (e) =>
      toast.error("Couldn't add the result", {
        description: e instanceof ApiCallError ? e.message : undefined,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResultFormValues }) =>
      eventsService.updateResult(eventId, id, toResultInput(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Result updated");
      setEditingId(null);
    },
    onError: (e) =>
      toast.error("Couldn't save the result", {
        description: e instanceof ApiCallError ? e.message : undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsService.removeResult(eventId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Result deleted");
      setPendingDelete(null);
    },
    onError: (e) =>
      toast.error("Couldn't delete the result", {
        description: e instanceof ApiCallError ? e.message : undefined,
      }),
  });

  return (
    <SectionCard
      title="Results"
      description={
        results.length > 0
          ? `${results.length} placing${results.length === 1 ? "" : "s"} recorded.`
          : "The ranked table shown on the public event page."
      }
      icon={Trophy}
      tone="amber"
      action={
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" /> Add result
        </Button>
      }
      contentClassName="space-y-4"
    >
      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No results yet"
          description="Add placings once the event has been run — they appear on the public event page."
          action={
            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" /> Add the first result
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Athlete / Team</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) =>
                editingId === r.id ? (
                  <InlineEditRow
                    key={r.id}
                    result={r}
                    registrants={registrants}
                    onSave={(vals) => updateMutation.mutate({ id: r.id, input: vals })}
                    onCancel={() => setEditingId(null)}
                    saving={updateMutation.isPending}
                  />
                ) : (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.rank}</TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1">
                        {r.athleteOrTeam}
                        {(r.athleteProfileId || r.associationProfileId) && (
                          <span title="Tagged to a registered member" className="inline-flex">
                            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.state ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category ?? "—"}</TableCell>
                    <TableCell className="font-mono">{r.resultValue}</TableCell>
                    <TableCell className="font-mono text-xs">{r.timing ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.remarks ?? ""}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(r.id)} title="Edit result">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setPendingDelete(r)} title="Delete result">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {showAddDialog && (
        <AddResultDialog
          registrants={registrants}
          onSubmit={(vals) => createMutation.mutate(vals)}
          onClose={() => setShowAddDialog(false)}
          saving={createMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this result?"
        description={pendingDelete ? `Rank ${pendingDelete.rank} — ${pendingDelete.athleteOrTeam}` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDelete) await deleteMutation.mutateAsync(pendingDelete.id);
        }}
      />
    </SectionCard>
  );
}

// ── Registrant picker ──
// Tagging attaches the result to a real member profile. Picking a registrant
// also fills in the display name, which stays editable for external competitors.

function RegistrantPicker({
  registrants,
  value,
  setValue,
  className,
}: {
  registrants: EventRegistration[];
  value: { athleteProfileId?: string; associationProfileId?: string };
  setValue: UseFormSetValue<ResultFormValues>;
  className?: string;
}) {
  if (!registrants.length) return null;

  const selected =
    registrants.find(
      (r) =>
        (value.athleteProfileId && r.athleteProfileId === value.athleteProfileId) ||
        (value.associationProfileId && r.associationProfileId === value.associationProfileId)
    )?.id ?? "";

  return (
    <select
      className={className ?? "h-8 rounded-md border border-input bg-background px-2 text-xs"}
      value={selected}
      title="Tag this result to a confirmed registrant"
      onChange={(e) => {
        const reg = registrants.find((r) => r.id === e.target.value);
        if (!reg) {
          setValue("athleteProfileId", "");
          setValue("associationProfileId", "");
          return;
        }
        setValue("athleteProfileId", reg.athleteProfileId ?? "");
        setValue("associationProfileId", reg.associationProfileId ?? "");
        setValue("athleteOrTeam", registrantName(reg), { shouldValidate: true });
      }}
    >
      <option value="">Not tagged</option>
      {registrants.map((r) => (
        <option key={r.id} value={r.id}>{registrantName(r)}</option>
      ))}
    </select>
  );
}

// ── Add result dialog (P3 — creation never sits open on the page) ──

function AddResultDialog({
  registrants,
  onSubmit,
  onClose,
  saving,
}: {
  registrants: EventRegistration[];
  onSubmit: (v: ResultFormValues) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      rank: 1, athleteOrTeam: "", state: "", category: "", resultValue: "",
      timing: "", remarks: "", athleteProfileId: "", associationProfileId: "",
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add result</DialogTitle>
          <DialogDescription>
            Rank, name and result are required. Tag a confirmed registrant to link the placing to
            their profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Rank" {...register("rank")} />
            <Input placeholder="Result *" {...register("resultValue")} />
          </div>
          <Input placeholder="Athlete / Team *" {...register("athleteOrTeam")} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="State" {...register("state")} />
            <Input placeholder="Category" {...register("category")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Timing" {...register("timing")} />
            <Input placeholder="Remarks" {...register("remarks")} />
          </div>

          {registrants.length > 0 && (
            <RegistrantPicker
              registrants={registrants}
              value={{
                athleteProfileId: watch("athleteProfileId"),
                associationProfileId: watch("associationProfileId"),
              }}
              setValue={setValue}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          )}

          {(errors.rank || errors.athleteOrTeam || errors.resultValue) && (
            <p className="text-xs text-destructive">
              {errors.rank?.message || errors.athleteOrTeam?.message || errors.resultValue?.message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Inline edit row ──

function InlineEditRow({
  result,
  registrants,
  onSave,
  onCancel,
  saving,
}: {
  result: EventResult;
  registrants: EventRegistration[];
  onSave: (v: ResultFormValues) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { register, handleSubmit, setValue, watch } = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      rank: result.rank,
      athleteOrTeam: result.athleteOrTeam,
      state: result.state ?? "",
      category: result.category ?? "",
      resultValue: result.resultValue,
      timing: result.timing ?? "",
      remarks: result.remarks ?? "",
      athleteProfileId: result.athleteProfileId ?? "",
      associationProfileId: result.associationProfileId ?? "",
    },
  });

  return (
    <TableRow>
      <TableCell><Input type="number" className="w-16 h-8 text-xs" {...register("rank")} /></TableCell>
      <TableCell className="space-y-1">
        <Input className="h-8 text-xs" {...register("athleteOrTeam")} />
        <RegistrantPicker
          registrants={registrants}
          value={{ athleteProfileId: watch("athleteProfileId"), associationProfileId: watch("associationProfileId") }}
          setValue={setValue}
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-[11px]"
        />
      </TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("state")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("category")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("resultValue")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("timing")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("remarks")} /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSubmit(onSave)} disabled={saving} title="Save">
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel} title="Cancel">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
