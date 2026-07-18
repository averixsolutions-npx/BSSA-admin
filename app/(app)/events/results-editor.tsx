"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import type { EventResult } from "@/lib/types";
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
  remarks: z.string().trim().optional().or(z.literal("")),
});

type ResultFormValues = z.infer<typeof resultSchema>;

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

  const createMutation = useMutation({
    mutationFn: (input: ResultFormValues) =>
      eventsService.createResult(eventId, {
        ...input,
        state: input.state || undefined,
        category: input.category || undefined,
        remarks: input.remarks || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Result added");
      setShowAddForm(false);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResultFormValues }) =>
      eventsService.updateResult(eventId, id, {
        ...input,
        state: input.state || undefined,
        category: input.category || undefined,
        remarks: input.remarks || undefined,
      }),
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
                    onSave={(vals) => updateMutation.mutate({ id: r.id, input: vals })}
                    onCancel={() => setEditingId(null)}
                    saving={updateMutation.isPending}
                  />
                ) : (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.rank}</TableCell>
                    <TableCell className="font-medium">{r.athleteOrTeam}</TableCell>
                    <TableCell className="text-muted-foreground">{r.state ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category ?? "—"}</TableCell>
                    <TableCell className="font-mono">{r.resultValue}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.remarks ?? ""}</TableCell>
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

// ── Add result form (appears at the bottom of the results section) ──

function AddResultForm({
  onSubmit,
  onCancel,
  saving,
}: {
  onSubmit: (v: ResultFormValues) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: { rank: 1, athleteOrTeam: "", state: "", category: "", resultValue: "", remarks: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-medium">Add result</p>
      <div className="grid grid-cols-6 gap-2">
        <Input type="number" placeholder="Rank" {...register("rank")} className="col-span-1" />
        <Input placeholder="Athlete / Team *" {...register("athleteOrTeam")} className="col-span-2" />
        <Input placeholder="State" {...register("state")} className="col-span-1" />
        <Input placeholder="Result *" {...register("resultValue")} className="col-span-1" />
        <Input placeholder="Remarks" {...register("remarks")} className="col-span-1" />
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
  onSave,
  onCancel,
  saving,
}: {
  result: EventResult;
  onSave: (v: ResultFormValues) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { register, handleSubmit } = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      rank: result.rank,
      athleteOrTeam: result.athleteOrTeam,
      state: result.state ?? "",
      category: result.category ?? "",
      resultValue: result.resultValue,
      remarks: result.remarks ?? "",
    },
  });

  return (
    <TableRow>
      <TableCell><Input type="number" className="w-16 h-8 text-xs" {...register("rank")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("athleteOrTeam")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("state")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("category")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("resultValue")} /></TableCell>
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
