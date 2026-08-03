"use client";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Eye, EyeOff, Trash2, ArrowLeft, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import { ApiCallError } from "@/lib/api-client";
import { isRegistrationFormEmpty } from "@/components/registration/registration-form-editor";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SectionCard } from "@/components/section-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { EventForm, toRegistrationInput, type EventFormValues } from "../event-form";
import { ResultsEditor } from "../results-editor";
import { EventRegistrationsTable } from "@/components/event-registrations-table";
import type { Event } from "@/lib/types";

// What has to be true before this event can go live. Computed from the saved
// record, not the draft form, so it always reflects what Publish would act on.
function publishBlockers(event: Event): string[] {
  const blockers: string[] = [];
  if (event.registrationEnabled) {
    if (!event.allowedRegistrants || event.allowedRegistrants.length === 0) {
      blockers.push("choose who can register (athletes and/or associations)");
    }
    if (isRegistrationFormEmpty(event.standardFields ?? {}, event.registrationFields ?? [])) {
      blockers.push("add at least one field to the registration form");
    }
  }
  return blockers;
}

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Landing on an event normally shows what's happening with it
  // (registrations, results) — except right after creating it, where you're
  // still mid-setup and want to land back in the form, not an empty view.
  const [editing, setEditing] = useState(() => searchParams.get("new") === "1");

  // Drop the ?new=1 marker once read, so a later refresh doesn't re-open the form.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.replace(`/events/${id}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ["events", "detail", id],
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
  });

  // Once an event has registrations, its field keys are locked (answers are stored by key).
  const { data: regs = [] } = useQuery({
    queryKey: ["events", "registrations", id],
    queryFn: () => eventsService.listRegistrations(id),
    enabled: !!id && !!event?.registrationEnabled,
  });
  const lockedFieldKeys =
    regs.length > 0 ? (event?.registrationFields ?? []).map((f) => f.key) : [];

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
        ...toRegistrationInput(v),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event saved");
      setEditing(false);
    },
    onError: (e) => toast.error("Couldn't save the event", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const publishM = useMutation({
    mutationFn: () => eventsService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Event published"); },
    onError: (e) => toast.error("Couldn't publish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const unpublishM = useMutation({
    mutationFn: () => eventsService.unpublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Event unpublished"); },
    onError: (e) => toast.error("Couldn't unpublish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: () => eventsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Event deleted"); router.push("/events"); },
    onError: (e) => toast.error("Couldn't delete the event", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  if (isLoading || !event) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const pub = event.status === "PUBLISHED";

  const handlePublishClick = () => {
    const blockers = publishBlockers(event);
    if (blockers.length > 0) {
      toast.error("Can't publish yet", {
        description: `Before this goes live: ${blockers.join("; ")}.`,
      });
      return;
    }
    publishM.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Hidden while editing — the wizard's own Back/Cancel take over navigation,
          and a second "Back" button here reads as one of them but isn't. */}
      {!editing && (
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      )}
      <PageHeader
        title={event.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={event.status} />
            <span className="text-muted-foreground">{event.venue}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {format(new Date(event.startDate), "d MMM yyyy")} – {format(new Date(event.endDate), "d MMM yyyy")}
            </span>
          </span>
        }
        action={<>
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button>
          )}
          {pub ? <Button variant="outline" onClick={() => unpublishM.mutate()} disabled={unpublishM.isPending}><EyeOff className="h-4 w-4" />Unpublish</Button>
               : <Button variant="outline" onClick={handlePublishClick} disabled={publishM.isPending}><Eye className="h-4 w-4" />Publish</Button>}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button>
        </>}
      />

      {editing ? (
        <EventForm
          initialValues={event}
          onSubmit={async (v) => { await updateM.mutateAsync(v); }}
          onCancel={() => setEditing(false)}
          submitting={updateM.isPending}
          submitLabel="Save changes"
          lockedFieldKeys={lockedFieldKeys}
        />
      ) : (
        <div className="max-w-3xl space-y-5 animate-in fade-in-0 duration-200">
          {event.registrationEnabled ? (
            <EventRegistrationsTable
              eventId={id}
              fields={event.registrationFields ?? []}
              standardFields={event.standardFields ?? undefined}
            />
          ) : (
            <SectionCard
              title="Registration"
              description="Off for this event."
              icon={UserPlus}
              tone="violet"
            >
              <p className="text-sm text-muted-foreground">
                Turn on registration in the form to start accepting entries before results go up.
                <button type="button" onClick={() => setEditing(true)} className="ml-1 font-medium text-primary hover:underline">
                  Edit the event
                </button>
              </p>
            </SectionCard>
          )}

          <ResultsEditor eventId={id} />
        </div>
      )}

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete event?" description={`"${event.title}" and all results will be permanently deleted.`} confirmLabel="Delete" destructive onConfirm={() => deleteM.mutateAsync()} />
    </div>
  );
}
