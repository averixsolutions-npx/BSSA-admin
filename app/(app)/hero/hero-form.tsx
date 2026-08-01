"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image as ImageIcon, Loader2, MousePointerClick } from "lucide-react";

import type { HeroSlide } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { SectionCard } from "@/components/section-card";
import { Disclosure } from "@/components/disclosure";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const heroSchema = z.object({
  imageUrl: z.string().url("An image is required"),
  headline: z.string().trim().min(1, "Headline is required").max(200),
  tag: z.string().trim().max(80).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(60).optional().or(z.literal("")),
  ctaHref: z.string().trim().max(500).optional().or(z.literal("")),
});

export type HeroFormValues = z.infer<typeof heroSchema>;

interface HeroFormProps {
  initialValues?: Partial<HeroSlide>;
  onSubmit: (v: HeroFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function HeroForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: HeroFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<HeroFormValues>({
    resolver: zodResolver(heroSchema),
    defaultValues: {
      imageUrl: initialValues?.imageUrl ?? "",
      headline: initialValues?.headline ?? "",
      tag: initialValues?.tag ?? "",
      ctaLabel: initialValues?.ctaLabel ?? "",
      ctaHref: initialValues?.ctaHref ?? "",
    },
  });

  const hasExtras = Boolean(initialValues?.tag || initialValues?.ctaLabel || initialValues?.ctaHref);
  const extrasInvalid = Boolean(errors.tag || errors.ctaLabel || errors.ctaHref);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
      <SectionCard
        title="Slide"
        description="The image and headline in the homepage carousel."
        icon={ImageIcon}
        tone="blue"
      >
        <FormField label="Slide image" required error={errors.imageUrl as { message?: string } | undefined}>
          <Controller name="imageUrl" control={control} render={({ field }) => (
            <FileDropzone folder="hero" value={field.value || null} onChange={(url) => field.onChange(url ?? "")} emptyLabel="Upload the hero image (JPG, PNG, WebP)" />
          )} />
        </FormField>

        <FormField label="Headline" required error={errors.headline}>
          <Input {...register("headline")} />
        </FormField>
      </SectionCard>

      <SectionCard
        title="Overlay"
        description="Optional eyebrow text and a button on the slide."
        icon={MousePointerClick}
        tone="amber"
      >
        <Disclosure
          label="Add an eyebrow and a button"
          openLabel="Hide eyebrow and button"
          count={3}
          defaultOpen={hasExtras}
          forceOpen={extrasInvalid}
          forceOpenReason="fix the errors below"
          contentClassName="space-y-5 pt-1"
        >
          <FormField label="Tag / eyebrow" error={errors.tag} hint="Small label above the headline.">
            <Input {...register("tag")} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="CTA label" error={errors.ctaLabel} hint="e.g. Learn more">
              <Input {...register("ctaLabel")} />
            </FormField>
            <FormField label="CTA link" error={errors.ctaHref} hint="e.g. /events">
              <Input {...register("ctaHref")} />
            </FormField>
          </div>
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
