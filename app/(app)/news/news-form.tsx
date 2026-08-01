"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, ImageIcon, Loader2, Newspaper } from "lucide-react";

import type { NewsArticle } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SectionCard } from "@/components/section-card";
import { Disclosure } from "@/components/disclosure";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const newsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  category: z.string().trim().min(1, "Category is required").max(64),
  coverUrl: z.string().url().nullable().optional(),
  body: z.string().trim().min(1, "Body cannot be empty"),
  pdfUrl: z.string().url().nullable().optional(),
});

export type NewsFormValues = z.infer<typeof newsSchema>;

interface NewsFormProps {
  initialValues?: Partial<NewsArticle>;
  onSubmit: (values: NewsFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function NewsForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save",
}: NewsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<NewsFormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      category: initialValues?.category ?? "News",
      coverUrl: initialValues?.coverUrl ?? null,
      body: initialValues?.body ?? "",
      pdfUrl: initialValues?.pdfUrl ?? null,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
      <SectionCard
        title="Article"
        description="How the piece is listed and filed."
        icon={Newspaper}
        tone="blue"
      >
        <FormField label="Title" htmlFor="title" required error={errors.title}>
          <Input id="title" {...register("title")} />
        </FormField>

        <FormField
          label="Category"
          htmlFor="category"
          required
          error={errors.category}
          hint="e.g. News, Announcement, Press Release"
        >
          <Input id="category" {...register("category")} />
        </FormField>
      </SectionCard>

      <SectionCard
        title="Body"
        description="The article itself, as readers see it."
        icon={FileText}
        tone="slate"
      >
        <FormField label="Body" required error={errors.body}>
          <Controller
            name="body"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="Write the article body…"
              />
            )}
          />
        </FormField>
      </SectionCard>

      <SectionCard
        title="Media"
        description="Optional cover image and attachment."
        icon={ImageIcon}
        tone="amber"
      >
        <FormField
          label="Cover image"
          error={errors.coverUrl as { message?: string } | undefined}
          hint="Shown on article cards and at the top of the article page."
        >
          <Controller
            name="coverUrl"
            control={control}
            render={({ field }) => (
              <FileDropzone
                folder="news"
                value={field.value}
                onChange={field.onChange}
                emptyLabel="Upload a cover image (JPG, PNG, WebP)"
              />
            )}
          />
        </FormField>

        <Disclosure
          label="Attach a PDF"
          openLabel="Hide PDF attachment"
          count={1}
          defaultOpen={!!initialValues?.pdfUrl}
          contentClassName="pt-1"
        >
          <FormField
            label="Attached PDF"
            hint="e.g. official results document or announcement PDF."
            error={errors.pdfUrl as { message?: string } | undefined}
          >
            <Controller
              name="pdfUrl"
              control={control}
              render={({ field }) => (
                <FileDropzone
                  folder="news"
                  accept={["application/pdf"]}
                  value={field.value}
                  onChange={field.onChange}
                  emptyLabel="Attach a PDF"
                />
              )}
            />
          </FormField>
        </Disclosure>
      </SectionCard>

      <div className="sticky bottom-0 z-10 flex items-center gap-2 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
