"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Megaphone } from "lucide-react";

import type { Announcement } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
  text: z.string().trim().min(1, "Text is required").max(280),
  href: z.string().trim().max(500).optional().or(z.literal("")),
});

export type AnnouncementFormValues = z.infer<typeof schema>;

interface Props {
  initialValues?: Partial<Announcement>;
  onSubmit: (v: AnnouncementFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function AnnouncementForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: initialValues?.text ?? "",
      href: initialValues?.href ?? "",
    },
  });

  const text = watch("text") ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <SectionCard
        title="Ticker item"
        description="One line that scrolls across the top of the public site."
        icon={Megaphone}
        tone="blue"
      >
        <FormField
          label="Text"
          required
          error={errors.text}
          hint={`${text.length}/280 characters`}
        >
          <Textarea {...register("text")} rows={2} placeholder="e.g. Registrations are now open — sign up today" />
        </FormField>

        <FormField label="Link" error={errors.href} hint="Optional. Where the ticker item points, e.g. /register">
          <Input {...register("href")} />
        </FormField>
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
