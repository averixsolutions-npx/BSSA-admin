"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Save, X, Link2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import type { EventResult } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { MemberTagCombobox } from "@/components/registration/member-tag-combobox";

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

// ── Add result dialog (P3 — creation never sits open on the page) ──

function AddResultDialog({
  onSubmit,
  onClose,
  saving,
}: {
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
            <FormField label="Rank" required error={errors.rank} hint="Finishing position, e.g. 1">
              <Input type="number" min={1} {...register("rank")} />
            </FormField>
            <FormField label="Result value" required error={errors.resultValue}
              hint="Time, score, or distance — not the rank.">
              <Input placeholder="e.g. 1:23.45 or 245.3 pts" {...register("resultValue")} />
            </FormField>
          </div>
          <FormField label="Athlete / team name" required error={errors.athleteOrTeam}>
            <Input placeholder="e.g. Aditya Gavali" {...register("athleteOrTeam")} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="State" hint="Optional">
              <Input placeholder="e.g. Maharashtra" {...register("state")} />
            </FormField>
            <FormField label="Category" hint="Optional — e.g. U18, Men's Slalom">
              <Input placeholder="e.g. Men's Slalom" {...register("category")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Timing" hint="Optional — race clock time">
              <Input placeholder="e.g. 1:23.45" {...register("timing")} />
            </FormField>
            <FormField label="Remarks" hint="Optional notes">
              <Input placeholder="e.g. DNF, DSQ, course record" {...register("remarks")} />
            </FormField>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tag a member <span className="font-normal">(optional)</span>
            </label>
            <MemberTagCombobox
              value={{
                athleteProfileId: watch("athleteProfileId") || undefined,
                associationProfileId: watch("associationProfileId") || undefined,
                label: watch("athleteOrTeam") || undefined,
              }}
              onChange={(next, member) => {
                setValue("athleteProfileId", next?.athleteProfileId ?? "");
                setValue("associationProfileId", next?.associationProfileId ?? "");
                if (member) setValue("athleteOrTeam", member.name, { shouldValidate: true });
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Links this placing to the member&apos;s public profile.
            </p>
          </div>

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
  onSave,
  onCancel,
  saving,
}: {
  result: EventResult;
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
      <TableCell><Input type="number" min={1} title="Finishing position" className="w-16 h-8 text-xs" {...register("rank")} /></TableCell>
      <TableCell className="space-y-1">
        <Input placeholder="Athlete / team name" title="Athlete / team name" className="h-8 text-xs" {...register("athleteOrTeam")} />
        <MemberTagCombobox
          size="sm"
          value={{
            athleteProfileId: watch("athleteProfileId") || undefined,
            associationProfileId: watch("associationProfileId") || undefined,
            label: watch("athleteOrTeam") || undefined,
          }}
          onChange={(next, member) => {
            setValue("athleteProfileId", next?.athleteProfileId ?? "");
            setValue("associationProfileId", next?.associationProfileId ?? "");
            if (member) setValue("athleteOrTeam", member.name, { shouldValidate: true });
          }}
        />
      </TableCell>
      <TableCell><Input placeholder="State" title="State" className="h-8 text-xs" {...register("state")} /></TableCell>
      <TableCell><Input placeholder="Category" title="Category, e.g. U18, Men's Slalom" className="h-8 text-xs" {...register("category")} /></TableCell>
      <TableCell><Input placeholder="Result value" title="Time, score, or distance — not the rank" className="h-8 text-xs" {...register("resultValue")} /></TableCell>
      <TableCell><Input placeholder="Timing" title="Race clock time, e.g. 1:23.45" className="h-8 text-xs" {...register("timing")} /></TableCell>
      <TableCell><Input placeholder="Remarks" title="Notes, e.g. DNF, DSQ" className="h-8 text-xs" {...register("remarks")} /></TableCell>
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
