"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import type { Program } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const programSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  bannerUrl: z.string().url().nullable().optional(),
  body: z.string().optional().or(z.literal("")),
});

export type ProgramFormValues = z.infer<typeof programSchema>;

interface ProgramFormProps {
  initialValues?: Partial<Program>;
  onSubmit: (v: ProgramFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function ProgramForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: ProgramFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      bannerUrl: initialValues?.bannerUrl ?? null,
      body: initialValues?.body ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <FormField label="Name" required error={errors.name}>
        <Input {...register("name")} />
      </FormField>

      <FormField label="Banner image" hint="Optional.">
        <Controller name="bannerUrl" control={control} render={({ field }) => (
          <FileDropzone folder="programs" value={field.value} onChange={field.onChange} emptyLabel="Upload a banner (JPG, PNG, WebP)" />
        )} />
      </FormField>

      <FormField label="Body">
        <Controller name="body" control={control} render={({ field }) => (
          <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="Program details…" />
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
