"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, FileText, Loader2 } from "lucide-react";

import type { Program } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SectionCard } from "@/components/section-card";
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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
      <SectionCard
        title="Program"
        description="Name and banner for the public program page."
        icon={BookOpen}
        tone="blue"
      >
        <FormField label="Name" required error={errors.name}>
          <Input {...register("name")} />
        </FormField>

        <FormField label="Banner image" hint="Optional. Shown at the top of the program page.">
          <Controller name="bannerUrl" control={control} render={({ field }) => (
            <FileDropzone folder="programs" value={field.value} onChange={field.onChange} emptyLabel="Upload a banner (JPG, PNG, WebP)" />
          )} />
        </FormField>
      </SectionCard>

      <SectionCard title="Body" description="What the program covers." icon={FileText} tone="slate">
        <Controller name="body" control={control} render={({ field }) => (
          <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="Program details…" />
        )} />
      </SectionCard>

      <div className="sticky bottom-0 z-10 flex items-center gap-2 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
      </div>
    </form>
  );
}
