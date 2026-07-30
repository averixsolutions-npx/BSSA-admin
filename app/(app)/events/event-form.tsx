"use client";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";

import type { Event, RegistrantType } from "@/lib/types";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const REGISTRATION_FIELD_TYPES = ["text", "number", "select", "date", "checkbox"] as const;

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  venue: z.string().trim().min(1, "Venue is required").max(200),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  disciplineTag: z.string().trim().max(60).optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  resultsPdfUrl: z.string().url().nullable().optional(),
  registrationEnabled: z.boolean().default(false),
  registrationOpensAt: z.string().optional().or(z.literal("")),
  registrationClosesAt: z.string().optional().or(z.literal("")),
  allowedRegistrants: z.array(z.enum(["ATHLETE", "ASSOCIATION"])).default([]),
  registrationFields: z
    .array(
      z.object({
        key: z.string().trim().min(1, "Key is required").max(40),
        label: z.string().trim().min(1, "Label is required").max(120),
        type: z.enum(REGISTRATION_FIELD_TYPES),
        required: z.boolean().default(false),
        // Held as a comma-separated string in the form; split on submit.
        optionsText: z.string().optional().or(z.literal("")),
      })
    )
    .default([]),
});

export type EventFormValues = z.infer<typeof eventSchema>;

/**
 * Normalises the registration part of the form into the shape the API expects:
 * empty date strings become undefined and `optionsText` becomes `options[]`
 * (only for select fields, which are the only ones that use it).
 */
export function toRegistrationInput(v: EventFormValues) {
  return {
    registrationEnabled: v.registrationEnabled,
    registrationOpensAt: v.registrationOpensAt || undefined,
    registrationClosesAt: v.registrationClosesAt || undefined,
    allowedRegistrants: v.allowedRegistrants,
    registrationFields: v.registrationFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      ...(f.type === "select"
        ? {
            options: (f.optionsText ?? "")
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean),
          }
        : {}),
    })),
  };
}

interface EventFormProps {
  initialValues?: Partial<Event>;
  onSubmit: (v: EventFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

function toDateInputValue(isoString?: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toISOString().slice(0, 16);
}

export function EventForm({ initialValues, onSubmit, onCancel, submitting, submitLabel = "Save" }: EventFormProps) {
  const { register, control, watch, handleSubmit, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      venue: initialValues?.venue ?? "",
      address: initialValues?.address ?? "",
      description: initialValues?.description ?? "",
      disciplineTag: initialValues?.disciplineTag ?? "",
      startDate: toDateInputValue(initialValues?.startDate),
      endDate: toDateInputValue(initialValues?.endDate),
      resultsPdfUrl: initialValues?.resultsPdfUrl ?? null,
      registrationEnabled: initialValues?.registrationEnabled ?? false,
      registrationOpensAt: toDateInputValue(initialValues?.registrationOpensAt),
      registrationClosesAt: toDateInputValue(initialValues?.registrationClosesAt),
      allowedRegistrants: initialValues?.allowedRegistrants ?? [],
      registrationFields: (initialValues?.registrationFields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        optionsText: (f.options ?? []).join(", "),
      })),
    },
  });

  const fieldArray = useFieldArray({ control, name: "registrationFields" });
  const registrationEnabled = watch("registrationEnabled");
  const fieldTypes = watch("registrationFields");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <FormField label="Title" required error={errors.title}>
        <Input {...register("title")} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date & time" required error={errors.startDate}>
          <Input type="datetime-local" {...register("startDate")} />
        </FormField>
        <FormField label="End date & time" required error={errors.endDate}>
          <Input type="datetime-local" {...register("endDate")} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Venue" required error={errors.venue}>
          <Input {...register("venue")} />
        </FormField>
        <FormField label="Address" error={errors.address}>
          <Input {...register("address")} />
        </FormField>
      </div>

      <FormField label="Discipline tag" error={errors.disciplineTag} hint="e.g. Alpine, Cross-Country">
        <Input {...register("disciplineTag")} />
      </FormField>

      <FormField label="Description">
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ""} onChange={field.onChange} placeholder="Event description…" />
          )}
        />
      </FormField>

      <FormField label="Results PDF" hint="Optional official results document">
        <Controller
          name="resultsPdfUrl"
          control={control}
          render={({ field }) => (
            <FileDropzone folder="events" accept={["application/pdf"]} value={field.value} onChange={field.onChange} emptyLabel="Attach results PDF" />
          )}
        />
      </FormField>

      {/* ── Registration ───────────────────────────────── */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Registration</p>
            <p className="text-xs text-muted-foreground">
              Let members register for this event and choose what details they must provide.
            </p>
          </div>
          <Controller
            name="registrationEnabled"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Enable registration" />
            )}
          />
        </div>

        {registrationEnabled && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Registration opens" error={errors.registrationOpensAt}>
                <Input type="datetime-local" {...register("registrationOpensAt")} />
              </FormField>
              <FormField label="Registration closes" error={errors.registrationClosesAt}>
                <Input type="datetime-local" {...register("registrationClosesAt")} />
              </FormField>
            </div>

            <FormField label="Who can register" error={errors.allowedRegistrants as { message?: string } | undefined}>
              <Controller
                name="allowedRegistrants"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-4">
                    {(["ATHLETE", "ASSOCIATION"] as RegistrantType[]).map((who) => (
                      <label key={who} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(who)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked ? [...field.value, who] : field.value.filter((w) => w !== who)
                            )
                          }
                        />
                        {who === "ATHLETE" ? "Athletes" : "Associations"}
                      </label>
                    ))}
                  </div>
                )}
              />
            </FormField>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Registration form fields</p>
                  <p className="text-xs text-muted-foreground">
                    Details registrants must fill in. The key is stored with each answer — don&apos;t change it once
                    registrations exist.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    fieldArray.append({ key: "", label: "", type: "text", required: false, optionsText: "" })
                  }
                >
                  <Plus className="h-4 w-4" /> Add field
                </Button>
              </div>

              {fieldArray.fields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No extra fields — registrants only submit their identity.
                </p>
              ) : (
                <div className="space-y-2">
                  {fieldArray.fields.map((f, i) => (
                    <div key={f.id} className="grid grid-cols-12 items-center gap-2 rounded-md border bg-muted/30 p-2">
                      <Input placeholder="key" className="col-span-3 h-8 text-xs" {...register(`registrationFields.${i}.key`)} />
                      <Input placeholder="Label" className="col-span-3 h-8 text-xs" {...register(`registrationFields.${i}.label`)} />
                      <select
                        className="col-span-2 h-8 rounded-md border border-input bg-background px-2 text-xs"
                        {...register(`registrationFields.${i}.type`)}
                      >
                        {REGISTRATION_FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <label className="col-span-2 flex items-center gap-2 text-xs">
                        <Controller
                          name={`registrationFields.${i}.required`}
                          control={control}
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Required" />
                          )}
                        />
                        Required
                      </label>
                      {fieldTypes?.[i]?.type === "select" ? (
                        <Input
                          placeholder="Option A, Option B"
                          className="col-span-1 h-8 text-xs"
                          title="Comma-separated options"
                          {...register(`registrationFields.${i}.optionsText`)}
                        />
                      ) : (
                        <span className="col-span-1" />
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="col-span-1 h-7 w-7 text-destructive"
                        onClick={() => fieldArray.remove(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {errors.registrationFields && (
                    <p className="text-xs text-destructive">Every field needs a key and a label.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
