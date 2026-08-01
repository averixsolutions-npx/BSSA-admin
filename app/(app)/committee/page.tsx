"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MoreHorizontal, Pencil, Trash2, Plus, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { committeeService } from "@/lib/services/committee";
import type { CommitteeMember } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListShell } from "@/components/list-shell";
import { ReorderableList } from "@/components/reorderable-list";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(120),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  photoUrl: z.string().url().nullable().optional(),
});
type MemberFormValues = z.infer<typeof memberSchema>;

export default function CommitteeListPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CommitteeMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CommitteeMember | null>(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["committee", "list"],
    queryFn: () => committeeService.list(),
  });

  const reorderM = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => committeeService.reorder(order),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["committee"] }); },
    onError: (e) => toast.error("Couldn't save the new order", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const createM = useMutation({
    mutationFn: (v: MemberFormValues) => committeeService.create({ name: v.name, role: v.role, bio: v.bio || undefined, photoUrl: v.photoUrl ?? undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["committee"] }); toast.success("Member added"); setCreating(false); },
    onError: (e) => toast.error("Couldn't add the member", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: MemberFormValues }) => committeeService.update(id, { name: v.name, role: v.role, bio: v.bio || undefined, photoUrl: v.photoUrl ?? undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["committee"] }); toast.success("Member saved"); setEditing(null); },
    onError: (e) => toast.error("Couldn't save the member", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => committeeService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["committee"] }); toast.success("Member deleted"); setPendingDelete(null); },
    onError: (e) => toast.error("Couldn't delete the member", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Committee" description="Leadership profiles. Drag to reorder." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New member</Button>} />

      <ListShell
        isLoading={isLoading}
        isError={isError}
        errorTitle="Couldn't load committee members"
        isEmpty={items.length === 0}
        empty={{
          icon: Users,
          title: "No committee members yet",
          description: "Leadership profiles shown on the public About page.",
          action: (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />Add the first member
            </Button>
          ),
        }}
      >
        <ReorderableList
          items={items}
          onReorder={(order) => reorderM.mutate(order)}
          renderItem={(m) => (
            <div className="flex items-center gap-3">
              <Avatar>
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <AvatarFallback>{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(m)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(m)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        />
      </ListShell>

      {creating && (
        <MemberDialog
          title="New committee member"
          onSubmit={(v) => createM.mutate(v)}
          onClose={() => setCreating(false)}
          saving={createM.isPending}
        />
      )}
      {editing && (
        <MemberDialog
          title="Edit committee member"
          initialValues={editing}
          onSubmit={(v) => updateM.mutate({ id: editing.id, v })}
          onClose={() => setEditing(null)}
          saving={updateM.isPending}
        />
      )}

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete member?" description={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}

function MemberDialog({
  title, initialValues, onSubmit, onClose, saving,
}: {
  title: string;
  initialValues?: CommitteeMember;
  onSubmit: (v: MemberFormValues) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      role: initialValues?.role ?? "",
      bio: initialValues?.bio ?? "",
      photoUrl: initialValues?.photoUrl ?? null,
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name}>
            <Input {...register("name")} />
          </FormField>
          <FormField label="Role / designation" required error={errors.role}>
            <Input {...register("role")} />
          </FormField>
          <FormField label="Bio" error={errors.bio}>
            <Textarea {...register("bio")} rows={4} />
          </FormField>
          <FormField label="Photo">
            <Controller name="photoUrl" control={control} render={({ field }) => (
              <FileDropzone folder="committee" value={field.value} onChange={field.onChange} emptyLabel="Upload a photo (JPG, PNG, WebP)" />
            )} />
          </FormField>
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
