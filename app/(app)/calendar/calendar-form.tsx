"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar } from "lucide-react";

import type { CalendarEntry } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

const calendarSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  eventDate: z.string().min(1, "Date is required"),
  location: z.string().trim().min(1, "Location is required").max(200),
});

export type CalendarFormValues = z.infer<typeof calendarSchema>;

interface Props {
  initialValues?: Partial<CalendarEntry>;
  onSubmit: (v: CalendarFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function CalendarForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CalendarFormValues>({
    resolver: zodResolver(calendarSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      eventDate: initialValues?.eventDate ?? "",
      location: initialValues?.location ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <SectionCard
        title="Calendar entry"
        description="A lightweight dated entry — shows in the Calendar on the public Events & Calendar page."
        icon={Calendar}
        tone="blue"
      >
        <div className="space-y-4">
          <FormField label="Name" required error={errors.name}>
            <Input {...register("name")} placeholder="e.g. National Alpine Trials" />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Date" required error={errors.eventDate}>
              <Controller
                name="eventDate"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={(v) => field.onChange(v ?? "")} />
                )}
              />
            </FormField>
            <FormField label="Location" required error={errors.location}>
              <Input {...register("location")} placeholder="e.g. Gulmarg, J&K" />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>{submitLabel}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
