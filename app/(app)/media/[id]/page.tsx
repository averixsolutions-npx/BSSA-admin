"use client";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { mediaService } from "@/lib/services/media";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadError } from "@/components/load-error";
import { Button } from "@/components/ui/button";
import { MediaForm, type MediaFormValues } from "../media-form";

export default function EditMediaPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["media", "detail", id],
    queryFn: () => mediaService.getById(id),
    enabled: !!id,
  });

  const updateM = useMutation({
    mutationFn: (v: MediaFormValues) =>
      mediaService.update(id, {
        title: v.title,
        platform: v.platform,
        sourceUrl: v.sourceUrl,
        disciplineTag: v.disciplineTag || undefined,
        eventTag: v.eventTag || undefined,
        duration: v.duration || undefined,
        thumbnailUrl: v.thumbnailUrl ?? undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Media saved"); },
    onError: (e) => toast.error("Couldn't save the media item", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const publishM = useMutation({
    mutationFn: () => mediaService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Media published"); },
    onError: (e) => toast.error("Couldn't publish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const unpublishM = useMutation({
    mutationFn: () => mediaService.unpublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Media unpublished"); },
    onError: (e) => toast.error("Couldn't unpublish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: () => mediaService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Media deleted"); router.push("/media"); },
    onError: (e) => toast.error("Couldn't delete the media item", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (isError || !item) return (
    <LoadError title="Couldn't load this media item" backLabel="Back to media" onBack={() => router.push("/media")} />
  );

  const pub = item.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title={item.title}
        description={<span className="flex items-center gap-2"><StatusBadge status={item.status} /><span className="text-muted-foreground">{item.platform.charAt(0) + item.platform.slice(1).toLowerCase()}</span></span>}
        action={<>
          {pub ? <Button variant="outline" onClick={() => unpublishM.mutate()}><EyeOff className="h-4 w-4" />Unpublish</Button>
               : <Button variant="outline" onClick={() => publishM.mutate()}><Eye className="h-4 w-4" />Publish</Button>}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button>
        </>}
      />
      <MediaForm initialValues={item} onSubmit={async (v) => { await updateM.mutateAsync(v); }} onCancel={() => router.push("/media")} submitting={updateM.isPending} submitLabel="Save changes" />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete media item?" description={`"${item.title}" will be permanently deleted.`} confirmLabel="Delete" destructive onConfirm={() => deleteM.mutateAsync()} />
    </div>
  );
}
