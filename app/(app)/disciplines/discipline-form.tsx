"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import type { Discipline } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const disciplineSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  bannerUrl: z.string().url().nullable().optional(),
  description: z.string().optional().or(z.literal("")),
  selectionCriteria: z.string().optional().or(z.literal("")),
  history: z.string().optional().or(z.literal("")),
});

export type DisciplineFormValues = z.infer<typeof disciplineSchema>;

interface DisciplineFormProps {
  initialValues?: Partial<Discipline>;
  onSubmit: (v: DisciplineFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function DisciplineForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: DisciplineFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<DisciplineFormValues>({
    resolver: zodResolver(disciplineSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      bannerUrl: initialValues?.bannerUrl ?? null,
      description: initialValues?.description ?? "",
      selectionCriteria: initialValues?.selectionCriteria ?? "",
      history: initialValues?.history ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <FormField label="Name" required error={errors.name}>
        <Input {...register("name")} />
      </FormField>

      <FormField label="Banner image" hint="Optional. Shown at the top of the discipline page.">
        <Controller
          name="bannerUrl"
          control={control}
          render={({ field }) => (
            <FileDropzone folder="disciplines" value={field.value} onChange={field.onChange} emptyLabel="Upload a banner (JPG, PNG, WebP)" />
          )}
        />
      </FormField>

      <FormField label="Description">
        <Controller name="description" control={control} render={({ field }) => (
          <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="Describe this discipline…" />
        )} />
      </FormField>

      <FormField label="Selection criteria">
        <Controller name="selectionCriteria" control={control} render={({ field }) => (
          <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="National team selection criteria…" />
        )} />
      </FormField>

      <FormField label="History & notable athletes">
        <Controller name="history" control={control} render={({ field }) => (
          <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="History and notable athletes…" />
        )} />
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
