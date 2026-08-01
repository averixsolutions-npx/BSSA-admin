"use client";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { programsService } from "@/lib/services/programs";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadError } from "@/components/load-error";
import { Button } from "@/components/ui/button";
import { ProgramForm, type ProgramFormValues } from "../program-form";

export default function EditProgramPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["programs", "detail", id],
    queryFn: () => programsService.getById(id),
    enabled: !!id,
  });

  const updateM = useMutation({
    mutationFn: (v: ProgramFormValues) =>
      programsService.update(id, {
        name: v.name,
        bannerUrl: v.bannerUrl ?? undefined,
        body: v.body || undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast.success("Program saved"); },
    onError: (e) => toast.error("Couldn't save the program", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const publishM = useMutation({
    mutationFn: () => programsService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast.success("Program published"); },
    onError: (e) => toast.error("Couldn't publish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const unpublishM = useMutation({
    mutationFn: () => programsService.unpublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast.success("Program unpublished"); },
    onError: (e) => toast.error("Couldn't unpublish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: () => programsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast.success("Program deleted"); router.push("/programs"); },
    onError: (e) => toast.error("Couldn't delete the program", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (isError || !item) return (
    <LoadError title="Couldn't load this program" backLabel="Back to programs" onBack={() => router.push("/programs")} />
  );

  const pub = item.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title={item.name}
        description={<span className="flex items-center gap-2"><StatusBadge status={item.status} /><span className="text-muted-foreground">/{item.slug}</span></span>}
        action={<>
          {pub ? <Button variant="outline" onClick={() => unpublishM.mutate()}><EyeOff className="h-4 w-4" />Unpublish</Button>
               : <Button variant="outline" onClick={() => publishM.mutate()}><Eye className="h-4 w-4" />Publish</Button>}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button>
        </>}
      />
      <ProgramForm initialValues={item} onSubmit={async (v) => { await updateM.mutateAsync(v); }} onCancel={() => router.push("/programs")} submitting={updateM.isPending} submitLabel="Save changes" />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete program?" description={`"${item.name}" will be permanently deleted.`} confirmLabel="Delete" destructive onConfirm={() => deleteM.mutateAsync()} />
    </div>
  );
}
