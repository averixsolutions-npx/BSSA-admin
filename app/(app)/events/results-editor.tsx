"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Save, X, Link2 } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import type { EventResult, EventRegistration } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
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

  const [showAddForm, setShowAddForm] = useState(false);
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
      setShowAddForm(false);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResultFormValues }) =>
      eventsService.updateResult(eventId, id, toResultInput(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Result updated");
      setEditingId(null);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsService.removeResult(eventId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Result deleted");
      setPendingDelete(null);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Results table</h3>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" /> Add result
          </Button>
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-md border">
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
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(r.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setPendingDelete(r)}>
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

      {results.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground py-4">No results recorded for this event yet.</p>
      )}

      {showAddForm && (
        <AddResultForm
          registrants={registrants}
          onSubmit={(vals) => createMutation.mutate(vals)}
          onCancel={() => setShowAddForm(false)}
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
    </div>
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

// ── Add result form (appears at the bottom of the results section) ──

function AddResultForm({
  registrants,
  onSubmit,
  onCancel,
  saving,
}: {
  registrants: EventRegistration[];
  onSubmit: (v: ResultFormValues) => void;
  onCancel: () => void;
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
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-medium">Add result</p>
      <div className="grid grid-cols-7 gap-2">
        <Input type="number" placeholder="Rank" {...register("rank")} className="col-span-1" />
        <Input placeholder="Athlete / Team *" {...register("athleteOrTeam")} className="col-span-2" />
        <Input placeholder="State" {...register("state")} className="col-span-1" />
        <Input placeholder="Category" {...register("category")} className="col-span-1" />
        <Input placeholder="Result *" {...register("resultValue")} className="col-span-1" />
        <Input placeholder="Timing" {...register("timing")} className="col-span-1" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        <Input placeholder="Remarks" {...register("remarks")} className="col-span-2" />
        {registrants.length > 0 && (
          <RegistrantPicker
            registrants={registrants}
            value={{ athleteProfileId: watch("athleteProfileId"), associationProfileId: watch("associationProfileId") }}
            setValue={setValue}
            className="col-span-2 h-10 rounded-md border border-input bg-background px-2 text-sm"
          />
        )}
      </div>
      {(errors.rank || errors.athleteOrTeam || errors.resultValue) && (
        <p className="text-xs text-destructive">
          {errors.rank?.message || errors.athleteOrTeam?.message || errors.resultValue?.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Add
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
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
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSubmit(onSave)} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
