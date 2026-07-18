"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { eventsService } from "@/lib/services/events";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { EventForm, type EventFormValues } from "../event-form";

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
      }),
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Saved");
      router.push(`/events/${event.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not create event");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New event"
        description="Create the event, then add results on the edit page once it's saved."
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
