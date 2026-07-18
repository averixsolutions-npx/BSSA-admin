"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MoreHorizontal, Pencil, Trash2, Plus, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { stateAssociationsService } from "@/lib/services/state-associations";
import type { StateAssociation } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReorderableList } from "@/components/reorderable-list";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const assocSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  state: z.string().trim().min(1, "State is required").max(80),
  contact: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});
type AssocFormValues = z.infer<typeof assocSchema>;

export default function StateAssociationsListPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StateAssociation | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StateAssociation | null>(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["state-associations", "list"],
    queryFn: () => stateAssociationsService.list(),
  });

  const reorderM = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => stateAssociationsService.reorder(order),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["state-associations"] }); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not reorder"),
  });
  const createM = useMutation({
    mutationFn: (v: AssocFormValues) => stateAssociationsService.create({ name: v.name, state: v.state, contact: v.contact || undefined, email: v.email || undefined, phone: v.phone || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["state-associations"] }); toast.success("Association added"); setCreating(false); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: AssocFormValues }) => stateAssociationsService.update(id, { name: v.name, state: v.state, contact: v.contact || undefined, email: v.email || undefined, phone: v.phone || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["state-associations"] }); toast.success("Saved"); setEditing(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => stateAssociationsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["state-associations"] }); toast.success("Deleted"); setPendingDelete(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="State associations" description="Affiliated state/regional units. Drag to reorder." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New association</Button>} />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : isError ? (
        <p className="text-destructive">Couldn't load associations.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No associations yet.</p>
      ) : (
        <ReorderableList
          items={items}
          onReorder={(order) => reorderM.mutate(order)}
          renderItem={(a) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><MapPin className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.state}{a.contact ? ` · ${a.contact}` : ""}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(a)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(a)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        />
      )}

      {creating && (
        <AssocDialog title="New association" onSubmit={(v) => createM.mutate(v)} onClose={() => setCreating(false)} saving={createM.isPending} />
      )}
      {editing && (
        <AssocDialog title="Edit association" initialValues={editing} onSubmit={(v) => updateM.mutate({ id: editing.id, v })} onClose={() => setEditing(null)} saving={updateM.isPending} />
      )}

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete association?" description={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}

function AssocDialog({
  title, initialValues, onSubmit, onClose, saving,
}: {
  title: string;
  initialValues?: StateAssociation;
  onSubmit: (v: AssocFormValues) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AssocFormValues>({
    resolver: zodResolver(assocSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      state: initialValues?.state ?? "",
      contact: initialValues?.contact ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name}><Input {...register("name")} /></FormField>
          <FormField label="State" required error={errors.state}><Input {...register("state")} /></FormField>
          <FormField label="Contact person" error={errors.contact}><Input {...register("contact")} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" error={errors.email}><Input type="email" {...register("email")} /></FormField>
            <FormField label="Phone" error={errors.phone}><Input {...register("phone")} /></FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
