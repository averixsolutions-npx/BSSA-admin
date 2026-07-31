"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import type { Event, RegistrantType } from "@/lib/types";
import { eventSchema, type EventFormValues } from "./event-schema";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DateTimePicker } from "@/components/ui/date-picker";
import { StandardFieldsEditor } from "@/components/registration/standard-fields-editor";
import { CustomFieldsEditor } from "@/components/registration/custom-fields-editor";
import { RegistrationPreview } from "@/components/registration/registration-preview";
import { FIELD_PRESETS, slugifyKey, uniqueKey } from "@/lib/registration";

export { toRegistrationInput, type EventFormValues } from "./event-schema";

interface EventFormProps {
  initialValues?: Partial<Event>;
  onSubmit: (v: EventFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
  lockedFieldKeys?: string[]; // keys with existing answers — locked (see backend guardrail)
}

export function EventForm({
  initialValues, onSubmit, onCancel, submitting, submitLabel = "Save", lockedFieldKeys = [],
}: EventFormProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      venue: initialValues?.venue ?? "",
      address: initialValues?.address ?? "",
      description: initialValues?.description ?? "",
      disciplineTag: initialValues?.disciplineTag ?? "",
      // Dates are stored/emitted as ISO instants — pass straight through (no UTC round-trip).
      startDate: initialValues?.startDate ?? "",
      endDate: initialValues?.endDate ?? "",
      resultsPdfUrl: initialValues?.resultsPdfUrl ?? null,
      registrationEnabled: initialValues?.registrationEnabled ?? false,
      registrationOpensAt: initialValues?.registrationOpensAt ?? "",
      registrationClosesAt: initialValues?.registrationClosesAt ?? "",
      allowedRegistrants: initialValues?.allowedRegistrants ?? [],
      standardFields: initialValues?.standardFields ?? {},
      registrationFields: (initialValues?.registrationFields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options ?? [],
        helpText: f.helpText ?? "",
      })),
    },
  });
  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = form;

  const registrationEnabled = watch("registrationEnabled");
  const standardFields = watch("standardFields");
  const registrationFields = watch("registrationFields");

  function addPreset(preset: (typeof FIELD_PRESETS)[number]) {
    const taken = (registrationFields ?? []).map((f) => f.key);
    setValue(
      "registrationFields",
      [
        ...(registrationFields ?? []),
        {
          key: uniqueKey(slugifyKey(preset.label), taken),
          label: preset.label,
          type: preset.type,
          required: preset.required ?? false,
          options: preset.options ?? [],
          helpText: preset.helpText ?? "",
        },
      ],
      { shouldDirty: true }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <FormField label="Title" required error={errors.title}>
        <Input {...register("title")} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date & time" required error={errors.startDate}>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DateTimePicker value={field.value} onChange={(v) => field.onChange(v ?? "")} />
            )}
          />
        </FormField>
        <FormField label="End date & time" required error={errors.endDate}>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DateTimePicker value={field.value} onChange={(v) => field.onChange(v ?? "")} />
            )}
          />
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
          <div className="space-y-6 border-t pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Registration opens" error={errors.registrationOpensAt}>
                <Controller
                  name="registrationOpensAt"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker value={field.value} onChange={(v) => field.onChange(v ?? "")} placeholder="No limit" />
                  )}
                />
              </FormField>
              <FormField label="Registration closes" error={errors.registrationClosesAt}>
                <Controller
                  name="registrationClosesAt"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker value={field.value} onChange={(v) => field.onChange(v ?? "")} placeholder="No limit" />
                  )}
                />
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
                            field.onChange(checked ? [...field.value, who] : field.value.filter((w) => w !== who))
                          }
                        />
                        {who === "ATHLETE" ? "Athletes" : "Associations"}
                      </label>
                    ))}
                  </div>
                )}
              />
            </FormField>

            <StandardFieldsEditor value={standardFields} onChange={(v) => setValue("standardFields", v, { shouldDirty: true })} />

            <CustomFieldsEditor
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
              lockedKeys={lockedFieldKeys}
            />

            {/* Quick-add presets */}
            <div className="flex flex-wrap gap-2">
              {FIELD_PRESETS.map((p) => (
                <Button key={p.label} type="button" size="sm" variant="secondary" onClick={() => addPreset(p)}>
                  + {p.label}
                </Button>
              ))}
            </div>

            <RegistrationPreview standardFields={standardFields} fields={registrationFields ?? []} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
      </div>
    </form>
  );
}
