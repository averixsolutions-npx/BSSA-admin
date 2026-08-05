"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { calendarService } from "@/lib/services/calendar";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CalendarForm, type CalendarFormValues } from "../calendar-form";

export default function NewCalendarEntryPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createM = useMutation({
    mutationFn: (v: CalendarFormValues) =>
      calendarService.create({ name: v.name, eventDate: v.eventDate, location: v.location }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Calendar entry created as draft");
      router.push(`/calendar/${c.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not create"),
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader title="New calendar entry" description="Create a draft, then publish when ready." />
      <CalendarForm
        onSubmit={async (v) => { await createM.mutateAsync(v); }}
        onCancel={() => router.push("/calendar")}
        submitting={createM.isPending}
        submitLabel="Create draft"
      />
    </div>
  );
}
