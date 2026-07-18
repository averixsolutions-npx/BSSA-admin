"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import type { NewsArticle } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <FormField label="Title" htmlFor="title" required error={errors.title}>
        <Input id="title" {...register("title")} />
      </FormField>

      <FormField label="Category" htmlFor="category" required error={errors.category}
        hint="e.g. News, Announcement, Press Release">
        <Input id="category" {...register("category")} />
      </FormField>

      <FormField label="Cover image" error={errors.coverUrl as { message?: string } | undefined}
        hint="Optional. Shown on article cards and at the top of the article page.">
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

      <FormField label="Attached PDF"
        hint="Optional. e.g. official results document or announcement PDF."
        error={errors.pdfUrl as { message?: string } | undefined}>
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

      <div className="flex items-center gap-2 pt-4 border-t">
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
