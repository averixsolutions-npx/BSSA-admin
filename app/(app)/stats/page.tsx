"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Save, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

import { statsService } from "@/lib/services/stats";
import type { SiteStat } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListShell } from "@/components/list-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

const statSchema = z.object({
  key: z.string().trim().min(1, "Key required").max(60),
  value: z.string().trim().min(1, "Value required").max(60),
  label: z.string().trim().min(1, "Label required").max(120),
});
type StatFormValues = z.infer<typeof statSchema>;

export default function StatsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SiteStat | null>(null);

  const { data: stats = [], isLoading, isError } = useQuery({
    queryKey: ["stats", "list"],
    queryFn: () => statsService.list(),
  });

  const createM = useMutation({
    mutationFn: (v: StatFormValues) => statsService.upsert(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stats"] }); toast.success("Stat added"); setCreating(false); },
    onError: (e) => toast.error("Couldn't add the stat", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: StatFormValues }) => statsService.update(id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stats"] }); toast.success("Stat saved"); setEditingId(null); },
    onError: (e) => toast.error("Couldn't save the stat", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => statsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stats"] }); toast.success("Stat deleted"); setPendingDelete(null); },
    onError: (e) => toast.error("Couldn't delete the stat", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site stats"
        description="Configurable figures shown in the homepage stats strip."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Add stat</Button>}
      />

      <ListShell
        isLoading={isLoading}
        isError={isError}
        errorTitle="Couldn't load site stats"
        isEmpty={stats.length === 0}
        empty={{
          icon: BarChart3,
          title: "No stats yet",
          description: "Add a figure — like registered athletes or events held — to show it on the homepage.",
          action: (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />Add the first stat
            </Button>
          ),
        }}
      >
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) =>
                editingId === s.id ? (
                  <StatEditRow key={s.id} stat={s} onSave={(v) => updateM.mutate({ id: s.id, v })} onCancel={() => setEditingId(null)} saving={updateM.isPending} />
                ) : (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.key}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{s.value}</TableCell>
                    <TableCell className="text-muted-foreground">{s.label}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(s.id)} title="Edit stat">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setPendingDelete(s)} title="Delete stat">
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
      </ListShell>

      {creating && (
        <AddStatDialog
          onSubmit={(v) => createM.mutate(v)}
          onClose={() => setCreating(false)}
          saving={createM.isPending}
        />
      )}

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete stat?" description={pendingDelete ? `"${pendingDelete.label}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}

function AddStatDialog({ onSubmit, onClose, saving }: { onSubmit: (v: StatFormValues) => void; onClose: () => void; saving: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<StatFormValues>({
    resolver: zodResolver(statSchema),
    defaultValues: { key: "", value: "", label: "" },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add stat</DialogTitle>
          <DialogDescription>
            The key identifies the figure in code; the label is what visitors read.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Key" required error={errors.key} hint="Lowercase identifier, e.g. registeredAthletes">
            <Input autoFocus placeholder="registeredAthletes" {...register("key")} />
          </FormField>
          <FormField label="Value" required error={errors.value}>
            <Input placeholder="1200" {...register("value")} />
          </FormField>
          <FormField label="Label" required error={errors.label}>
            <Input placeholder="Registered athletes" {...register("label")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add stat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatEditRow({ stat, onSave, onCancel, saving }: { stat: SiteStat; onSave: (v: StatFormValues) => void; onCancel: () => void; saving: boolean }) {
  const { register, handleSubmit } = useForm<StatFormValues>({
    resolver: zodResolver(statSchema),
    defaultValues: { key: stat.key, value: stat.value, label: stat.label },
  });
  return (
    <TableRow>
      <TableCell><Input className="h-8 text-xs" {...register("key")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("value")} /></TableCell>
      <TableCell><Input className="h-8 text-xs" {...register("label")} /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSubmit(onSave)} disabled={saving} title="Save"><Save className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel} title="Cancel"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
