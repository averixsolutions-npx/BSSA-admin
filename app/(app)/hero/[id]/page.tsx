"use client";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { heroService } from "@/lib/services/hero";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { HeroForm, type HeroFormValues } from "../hero-form";

export default function EditHeroPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["hero", "detail", id],
    queryFn: () => heroService.getById(id),
    enabled: !!id,
  });

  const updateM = useMutation({
    mutationFn: (v: HeroFormValues) =>
      heroService.update(id, {
        imageUrl: v.imageUrl,
        headline: v.headline,
        tag: v.tag || undefined,
        ctaLabel: v.ctaLabel || undefined,
        ctaHref: v.ctaHref || undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });
  const publishM = useMutation({ mutationFn: () => heroService.publish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); toast.success("Published"); } });
  const unpublishM = useMutation({ mutationFn: () => heroService.unpublish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); toast.success("Unpublished"); } });
  const deleteM = useMutation({ mutationFn: () => heroService.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); toast.success("Deleted"); router.push("/hero"); } });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (isError || !item) return (
    <div className="space-y-4">
      <p className="text-destructive">Couldn't load this slide.</p>
      <Button variant="outline" onClick={() => router.push("/hero")}>Back</Button>
    </div>
  );

  const pub = item.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.headline}
        description={<StatusBadge status={item.status} />}
        action={<>
          {pub ? <Button variant="outline" onClick={() => unpublishM.mutate()}><EyeOff className="h-4 w-4" />Unpublish</Button>
               : <Button variant="outline" onClick={() => publishM.mutate()}><Eye className="h-4 w-4" />Publish</Button>}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button>
        </>}
      />
      <HeroForm initialValues={item} onSubmit={async (v) => { await updateM.mutateAsync(v); }} onCancel={() => router.push("/hero")} submitting={updateM.isPending} submitLabel="Save changes" />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete hero slide?" description={`"${item.headline}" will be permanently deleted.`} confirmLabel="Delete" destructive onConfirm={() => deleteM.mutateAsync()} />
    </div>
  );
}
