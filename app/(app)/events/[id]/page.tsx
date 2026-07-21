"use client";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EventForm, type EventFormValues } from "../event-form";
import { ResultsEditor } from "../results-editor";

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["events", "detail", id],
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
  });

  const updateM = useMutation({
    mutationFn: (v: EventFormValues) =>
      eventsService.update(id, {
        title: v.title,
        venue: v.venue,
        address: v.address || undefined,
        description: v.description || undefined,
        disciplineTag: v.disciplineTag || undefined,
        startDate: v.startDate,
        endDate: v.endDate,
        resultsPdfUrl: v.resultsPdfUrl ?? undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const publishM = useMutation({ mutationFn: () => eventsService.publish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Published"); } });
  const unpublishM = useMutation({ mutationFn: () => eventsService.unpublish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Unpublished"); } });
  const deleteM = useMutation({ mutationFn: () => eventsService.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Deleted"); router.push("/events"); } });

  if (isLoading || !event) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const pub = event.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title={event.title}
        description={<span className="flex items-center gap-2"><StatusBadge status={event.status} /><span className="text-muted-foreground">{event.venue}</span></span>}
        action={<>
          {pub ? <Button variant="outline" onClick={() => unpublishM.mutate()}><EyeOff className="h-4 w-4" />Unpublish</Button>
               : <Button variant="outline" onClick={() => publishM.mutate()}><Eye className="h-4 w-4" />Publish</Button>}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button>
        </>}
      />

      <EventForm initialValues={event} onSubmit={async (v) => { await updateM.mutateAsync(v); }} onCancel={() => router.push("/events")} submitting={updateM.isPending} submitLabel="Save changes" />

      <Separator className="my-8" />

      <ResultsEditor eventId={id} />

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete event?" description={`"${event.title}" and all results will be permanently deleted.`} confirmLabel="Delete" destructive onConfirm={() => deleteM.mutateAsync()} />
    </div>
  );
}
