"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

import { statsService } from "@/lib/services/stats";
import type { SiteStat } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SiteStat | null>(null);

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["stats", "list"],
    queryFn: () => statsService.list(),
  });

  const createM = useMutation({
    mutationFn: (v: StatFormValues) => statsService.upsert(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stats"] }); toast.success("Stat added"); setShowAddForm(false); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: StatFormValues }) => statsService.update(id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stats"] }); toast.success("Saved"); setEditingId(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => statsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stats"] }); toast.success("Deleted"); setPendingDelete(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Site stats" description="Configurable figures shown in the homepage stats strip." action={!showAddForm ? <Button onClick={() => setShowAddForm(true)}><Plus className="h-4 w-4" />Add stat</Button> : undefined} />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-md border">
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
              {stats.length === 0 && !showAddForm && (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No stats yet.</TableCell></TableRow>
              )}
              {stats.map((s) =>
                editingId === s.id ? (
                  <StatEditRow key={s.id} stat={s} onSave={(v) => updateM.mutate({ id: s.id, v })} onCancel={() => setEditingId(null)} saving={updateM.isPending} />
                ) : (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.key}</TableCell>
                    <TableCell className="font-semibold">{s.value}</TableCell>
                    <TableCell className="text-muted-foreground">{s.label}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(s.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setPendingDelete(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {showAddForm && (
        <AddStatForm onSubmit={(v) => createM.mutate(v)} onCancel={() => setShowAddForm(false)} saving={createM.isPending} />
      )}

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete stat?" description={pendingDelete ? `"${pendingDelete.label}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}

function AddStatForm({ onSubmit, onCancel, saving }: { onSubmit: (v: StatFormValues) => void; onCancel: () => void; saving: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<StatFormValues>({
    resolver: zodResolver(statSchema),
    defaultValues: { key: "", value: "", label: "" },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-medium">Add stat</p>
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="key (e.g. registeredAthletes)" {...register("key")} />
        <Input placeholder="value (e.g. 1200)" {...register("value")} />
        <Input placeholder="label (e.g. Registered athletes)" {...register("label")} />
      </div>
      {(errors.key || errors.value || errors.label) && (
        <p className="text-xs text-destructive">{errors.key?.message || errors.value?.message || errors.label?.message}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={saving}>{saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Add</Button>
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
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
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSubmit(onSave)} disabled={saving}><Save className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}><X className="h-3.5 w-3.5" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
