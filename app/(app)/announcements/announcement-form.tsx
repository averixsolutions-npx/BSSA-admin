"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import type { Announcement } from "@/lib/types";
import { FormField } from "@/components/form-field";
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
  const { register, handleSubmit, formState: { errors } } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: initialValues?.text ?? "",
      href: initialValues?.href ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <FormField label="Text" required error={errors.text} hint="Shown in the scrolling ticker.">
        <Textarea {...register("text")} rows={2} placeholder="e.g. Registrations are now open — sign up today" />
      </FormField>

      <FormField label="Link" error={errors.href} hint="Optional. Where the ticker item points, e.g. /register">
        <Input {...register("href")} />
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
