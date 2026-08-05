"use client";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { calendarService } from "@/lib/services/calendar";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadError } from "@/components/load-error";
import { Button } from "@/components/ui/button";
import { CalendarForm, type CalendarFormValues } from "../calendar-form";

export default function EditCalendarEntryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["calendar", "detail", id],
    queryFn: () => calendarService.getById(id),
    enabled: !!id,
  });

  const updateM = useMutation({
    mutationFn: (v: CalendarFormValues) =>
      calendarService.update(id, { name: v.name, eventDate: v.eventDate, location: v.location }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast.success("Entry saved"); },
    onError: (e) => toast.error("Couldn't save", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const publishM = useMutation({
    mutationFn: () => calendarService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast.success("Published"); },
    onError: (e) => toast.error("Couldn't publish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const unpublishM = useMutation({
    mutationFn: () => calendarService.unpublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast.success("Unpublished"); },
    onError: (e) => toast.error("Couldn't unpublish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: () => calendarService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast.success("Deleted"); router.push("/calendar"); },
    onError: (e) => toast.error("Couldn't delete", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (isError || !item) return <LoadError title="Couldn't load this entry" backLabel="Back to calendar" onBack={() => router.push("/calendar")} />;

  const pub = item.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title={item.name}
        description={<StatusBadge status={item.status} />}
        action={
          <div className="flex items-center gap-2">
            {pub
              ? <Button variant="outline" size="sm" onClick={() => unpublishM.mutate()}><EyeOff className="h-4 w-4" />Unpublish</Button>
              : <Button variant="outline" size="sm" onClick={() => publishM.mutate()}><Eye className="h-4 w-4" />Publish</Button>}
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button>
          </div>
        }
      />
      <CalendarForm
        initialValues={item}
        onSubmit={async (v) => { await updateM.mutateAsync(v); }}
        onCancel={() => router.push("/calendar")}
        submitting={updateM.isPending}
        submitLabel="Save changes"
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete calendar entry?"
        description={`"${item.name}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { await deleteM.mutateAsync(); }}
      />
    </div>
  );
}
