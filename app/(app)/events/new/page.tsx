"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { EventForm, toRegistrationInput, type EventFormValues } from "../event-form";

export default function NewEventPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: EventFormValues) =>
      eventsService.create({
        title: values.title,
        venue: values.venue,
        address: values.address || undefined,
        description: values.description || undefined,
        disciplineTag: values.disciplineTag || undefined,
        startDate: values.startDate,
        endDate: values.endDate,
        resultsPdfUrl: values.resultsPdfUrl ?? undefined,
        ...toRegistrationInput(values),
      }),
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created as draft");
      // ?new=1 tells the event page to land back in the form instead of the
      // (empty, right now) registrations/results view.
      router.push(`/events/${event.id}?new=1`);
    },
    onError: (err) => {
      toast.error("Couldn't create the event", {
        description: err instanceof ApiCallError ? err.message : undefined,
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New event"
        description="Walk through each step below — Cancel at any point exits without saving."
      />
      <EventForm
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
        onCancel={() => router.push("/events")}
        submitting={createMutation.isPending}
        submitLabel="Create event"
      />
    </div>
  );
}
