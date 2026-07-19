"use client";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { announcementsService } from "@/lib/services/announcements";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { AnnouncementForm, type AnnouncementFormValues } from "../announcement-form";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["announcements", "detail", id],
    queryFn: () => announcementsService.getById(id),
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  const updateM = useMutation({
    mutationFn: (v: AnnouncementFormValues) =>
      announcementsService.update(id, { text: v.text, href: v.href || undefined }),
    onSuccess: () => { invalidate(); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });
  const toggleM = useMutation({
    mutationFn: (isActive: boolean) => announcementsService.update(id, { isActive }),
    onSuccess: () => { invalidate(); toast.success("Updated"); },
  });
  const deleteM = useMutation({
    mutationFn: () => announcementsService.remove(id),
    onSuccess: () => { invalidate(); toast.success("Deleted"); router.push("/announcements"); },
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (isError || !item) return (
    <div className="space-y-4">
      <p className="text-destructive">Couldn't load this announcement.</p>
      <Button variant="outline" onClick={() => router.push("/announcements")}>Back</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit announcement"
        description={<Badge variant={item.isActive ? "success" : "secondary"}>{item.isActive ? "Active" : "Hidden"}</Badge>}
        action={<>
          {item.isActive
            ? <Button variant="outline" onClick={() => toggleM.mutate(false)}><EyeOff className="h-4 w-4" />Hide</Button>
            : <Button variant="outline" onClick={() => toggleM.mutate(true)}><Eye className="h-4 w-4" />Show</Button>}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button>
        </>}
      />
      <AnnouncementForm
        initialValues={item}
        onSubmit={async (v) => { await updateM.mutateAsync(v); }}
        onCancel={() => router.push("/announcements")}
        submitting={updateM.isPending}
        submitLabel="Save changes"
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete announcement?"
        description={`"${item.text}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteM.mutateAsync()}
      />
    </div>
  );
}
