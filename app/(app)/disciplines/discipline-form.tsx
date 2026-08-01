"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Loader2, Trophy } from "lucide-react";

import type { Discipline } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SectionCard } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const disciplineSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  bannerUrl: z.string().url().nullable().optional(),
  description: z.string().optional().or(z.literal("")),
  selectionCriteria: z.string().optional().or(z.literal("")),
  history: z.string().optional().or(z.literal("")),
});

export type DisciplineFormValues = z.infer<typeof disciplineSchema>;

// The three long-form sections are tabbed rather than stacked — otherwise the
// page is three near-identical editors deep and you scroll to find the one you want.
const CONTENT_TABS = [
  { key: "description", label: "Description", placeholder: "Describe this discipline…" },
  { key: "selectionCriteria", label: "Selection criteria", placeholder: "National team selection criteria…" },
  { key: "history", label: "History", placeholder: "History and notable athletes…" },
] as const;

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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
      <SectionCard
        title="Discipline"
        description="Name and banner for the public discipline page."
        icon={Trophy}
        tone="blue"
      >
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
      </SectionCard>

      <SectionCard
        title="Page content"
        description="Three sections of the public page — switch between them here."
        icon={FileText}
        tone="slate"
      >
        <Tabs defaultValue={CONTENT_TABS[0].key}>
          <TabsList>
            {CONTENT_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          {CONTENT_TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              <Controller
                name={t.key}
                control={control}
                render={({ field }) => (
                  <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder={t.placeholder} />
                )}
              />
            </TabsContent>
          ))}
        </Tabs>
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
