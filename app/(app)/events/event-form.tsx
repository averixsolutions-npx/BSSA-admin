"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import type { Event } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  venue: z.string().trim().min(1, "Venue is required").max(200),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  disciplineTag: z.string().trim().max(60).optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  resultsPdfUrl: z.string().url().nullable().optional(),
});

export type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
  initialValues?: Partial<Event>;
  onSubmit: (v: EventFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

function toDateInputValue(isoString?: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toISOString().slice(0, 16);
}

export function EventForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: EventFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      venue: initialValues?.venue ?? "",
      address: initialValues?.address ?? "",
      description: initialValues?.description ?? "",
      disciplineTag: initialValues?.disciplineTag ?? "",
      startDate: toDateInputValue(initialValues?.startDate),
      endDate: toDateInputValue(initialValues?.endDate),
      resultsPdfUrl: initialValues?.resultsPdfUrl ?? null,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <FormField label="Title" required error={errors.title}>
        <Input {...register("title")} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date & time" required error={errors.startDate}>
          <Input type="datetime-local" {...register("startDate")} />
        </FormField>
        <FormField label="End date & time" required error={errors.endDate}>
          <Input type="datetime-local" {...register("endDate")} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Venue" required error={errors.venue}>
          <Input {...register("venue")} />
        </FormField>
        <FormField label="Address" error={errors.address}>
          <Input {...register("address")} />
        </FormField>
      </div>

      <FormField label="Discipline tag" error={errors.disciplineTag} hint="e.g. Alpine, Cross-Country">
        <Input {...register("disciplineTag")} />
      </FormField>

      <FormField label="Description">
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="Event description…" />
          )}
        />
      </FormField>

      <FormField label="Results PDF" hint="Optional official results document">
        <Controller
          name="resultsPdfUrl"
          control={control}
          render={({ field }) => (
            <FileDropzone folder="events" accept={["application/pdf"]} value={field.value} onChange={field.onChange} emptyLabel="Attach results PDF" />
          )}
        />
      </FormField>

      <div className="flex items-center gap-2 pt-4 border-t">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
      </div>
    </form>
  );
}
