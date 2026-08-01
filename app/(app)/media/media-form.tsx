"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Tags, Video } from "lucide-react";

import type { MediaItem, MediaPlatform } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { SectionCard } from "@/components/section-card";
import { Disclosure } from "@/components/disclosure";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const PLATFORMS: MediaPlatform[] = ["YOUTUBE", "INSTAGRAM", "TWITTER", "FACEBOOK", "VIMEO"];

const mediaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  platform: z.enum(["YOUTUBE", "INSTAGRAM", "TWITTER", "FACEBOOK", "VIMEO"]),
  sourceUrl: z.string().url("A valid source URL is required"),
  disciplineTag: z.string().trim().max(60).optional().or(z.literal("")),
  eventTag: z.string().trim().max(60).optional().or(z.literal("")),
  duration: z.string().trim().max(20).optional().or(z.literal("")),
  thumbnailUrl: z.string().url().nullable().optional(),
});

export type MediaFormValues = z.infer<typeof mediaSchema>;

interface MediaFormProps {
  initialValues?: Partial<MediaItem>;
  onSubmit: (v: MediaFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function MediaForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: MediaFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<MediaFormValues>({
    resolver: zodResolver(mediaSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      platform: initialValues?.platform ?? "YOUTUBE",
      sourceUrl: initialValues?.sourceUrl ?? "",
      disciplineTag: initialValues?.disciplineTag ?? "",
      eventTag: initialValues?.eventTag ?? "",
      duration: initialValues?.duration ?? "",
      thumbnailUrl: initialValues?.thumbnailUrl ?? null,
    },
  });

  const hasExtras = Boolean(
    initialValues?.disciplineTag || initialValues?.eventTag || initialValues?.thumbnailUrl
  );
  const extrasInvalid = Boolean(errors.disciplineTag || errors.eventTag || errors.thumbnailUrl);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
      <SectionCard
        title="Video"
        description="Where the clip lives and how it's listed."
        icon={Video}
        tone="blue"
      >
        <FormField label="Title" required error={errors.title}>
          <Input {...register("title")} />
        </FormField>

        <FormField
          label="Source URL"
          required
          error={errors.sourceUrl}
          hint="Paste the public video URL. The embed ID is extracted automatically."
        >
          <Input {...register("sourceUrl")} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Platform" required error={errors.platform as { message?: string } | undefined}>
            <Controller name="platform" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Duration" error={errors.duration} hint="e.g. 4:12">
            <Input {...register("duration")} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        title="Tags & thumbnail"
        description="Optional — helps the clip surface in filtered views."
        icon={Tags}
        tone="amber"
      >
        <Disclosure
          label="Add tags and a custom thumbnail"
          openLabel="Hide tags and thumbnail"
          count={3}
          defaultOpen={hasExtras}
          forceOpen={extrasInvalid}
          forceOpenReason="fix the errors below"
          contentClassName="space-y-5 pt-1"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Discipline tag" error={errors.disciplineTag}>
              <Input {...register("disciplineTag")} />
            </FormField>
            <FormField label="Event tag" error={errors.eventTag}>
              <Input {...register("eventTag")} />
            </FormField>
          </div>

          <FormField label="Custom thumbnail" hint="Only needed if the platform doesn't auto-derive one.">
            <Controller name="thumbnailUrl" control={control} render={({ field }) => (
              <FileDropzone folder="media" value={field.value} onChange={field.onChange} emptyLabel="Upload a thumbnail (JPG, PNG, WebP)" />
            )} />
          </FormField>
        </Disclosure>
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
