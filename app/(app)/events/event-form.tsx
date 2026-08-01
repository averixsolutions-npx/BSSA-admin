"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays, Clock, Eye, FileText, HelpCircle, Info, ListChecks, Loader2, Send, UserPlus, Users,
} from "lucide-react";
import { toast } from "sonner";

import type { Event, RegistrantType } from "@/lib/types";
import { eventSchema, type EventFormValues } from "./event-schema";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SectionCard } from "@/components/section-card";
import { Disclosure } from "@/components/disclosure";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateTimePicker } from "@/components/ui/date-picker";
import { StandardFieldsEditor } from "@/components/registration/standard-fields-editor";
import { CustomFieldsEditor } from "@/components/registration/custom-fields-editor";
import { RegistrationPreview } from "@/components/registration/registration-preview";
import { cn } from "@/lib/utils";

export { toRegistrationInput, type EventFormValues } from "./event-schema";

type TabKey = "details" | "schedule" | "publishing" | "registration";

// Which tab owns which field — drives the error dot on the tab trigger and the
// jump-to-first-error on a failed submit. A validation failure on a hidden tab
// would otherwise look like a dead Save button.
const TAB_FIELDS: Record<TabKey, readonly (keyof EventFormValues)[]> = {
  details: ["title", "venue", "address", "disciplineTag", "description"],
  schedule: ["startDate", "endDate"],
  publishing: ["resultsPdfUrl"],
  registration: [
    "registrationOpensAt", "registrationClosesAt", "allowedRegistrants",
    "standardFields", "registrationFields",
  ],
};

const TAB_ORDER: TabKey[] = ["details", "schedule", "publishing", "registration"];
const TAB_LABELS: Record<TabKey, string> = {
  details: "Details",
  schedule: "Schedule",
  publishing: "Publishing",
  registration: "Registration",
};

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

  const [tab, setTab] = React.useState<TabKey>("details");

  const registrationEnabled = watch("registrationEnabled");
  const standardFields = watch("standardFields");
  const registrationFields = watch("registrationFields");

  const tabHasError = (key: TabKey) => TAB_FIELDS[key].some((field) => !!errors[field]);

  // Optional metadata starts open only when it already holds a value (P2).
  const hasOptionalDetails = Boolean(initialValues?.address || initialValues?.disciplineTag);
  const optionalDetailsInvalid = Boolean(errors.address || errors.disciplineTag);

  const onInvalid = () => {
    const firstBadTab = TAB_ORDER.find((key) => TAB_FIELDS[key].some((f) => !!errors[f]));
    if (firstBadTab) setTab(firstBadTab);
    toast.error("Check the highlighted fields", {
      description: firstBadTab ? `Something needs fixing on ${TAB_LABELS[firstBadTab]}.` : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="max-w-3xl space-y-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {TAB_ORDER.map((key) => (
            <TabsTrigger key={key} value={key}>
              {TAB_LABELS[key]}
              {tabHasError(key) && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-destructive"
                  aria-label={`${TAB_LABELS[key]} has errors`}
                />
              )}
              {key === "registration" && registrationEnabled && !tabHasError("registration") && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Registration is on" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Details ───────────────────────────────── */}
        <TabsContent value="details" className="mt-5 space-y-5">
          <SectionCard
            title="Event details"
            description="What the event is and where it happens."
            icon={CalendarDays}
            tone="blue"
          >
            <FormField label="Title" required error={errors.title}>
              <Input {...register("title")} placeholder="e.g. National Alpine Championship 2026" />
            </FormField>

            <FormField label="Venue" required error={errors.venue}>
              <Input {...register("venue")} placeholder="e.g. Auli, Uttarakhand" />
            </FormField>

            <Disclosure
              label="Add optional details"
              openLabel="Hide optional details"
              count={2}
              defaultOpen={hasOptionalDetails}
              forceOpen={optionalDetailsInvalid}
              forceOpenReason="fix the errors below"
              contentClassName="space-y-5 pt-1"
            >
              <FormField label="Address" error={errors.address} hint="Full postal address, if you have one.">
                <Input {...register("address")} />
              </FormField>
              <FormField label="Discipline tag" error={errors.disciplineTag} hint="e.g. Alpine, Cross-Country">
                <Input {...register("disciplineTag")} />
              </FormField>
            </Disclosure>
          </SectionCard>

          <SectionCard
            title="Description"
            description="Shown on the public event page."
            icon={FileText}
            tone="slate"
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Event description…"
                />
              )}
            />
          </SectionCard>
        </TabsContent>

        {/* ── Schedule ──────────────────────────────── */}
        <TabsContent value="schedule" className="mt-5 space-y-5">
          <SectionCard
            title="When it runs"
            description="Both are required — the public calendar sorts on them."
            icon={Clock}
            tone="green"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </SectionCard>
        </TabsContent>

        {/* ── Publishing ────────────────────────────── */}
        <TabsContent value="publishing" className="mt-5 space-y-5">
          <SectionCard
            title="Visibility"
            description="Where this event sits in the publish flow."
            icon={Send}
            tone="amber"
            action={initialValues?.status ? <StatusBadge status={initialValues.status} /> : undefined}
          >
            <Alert variant="info">
              <Info />
              <div className="space-y-1">
                <AlertTitle>
                  {initialValues?.status === "PUBLISHED" ? "Live on the public site" : "Not published yet"}
                </AlertTitle>
                <AlertDescription>
                  {initialValues?.id
                    ? "Use Publish / Unpublish in the page header — saving here never changes visibility."
                    : "New events are created as a draft. Publish it from the event page once the details are right."}
                </AlertDescription>
              </div>
            </Alert>
          </SectionCard>

          <SectionCard
            title="Results document"
            description="Optional official results PDF, linked from the public event page."
            icon={FileText}
            tone="slate"
          >
            <Controller
              name="resultsPdfUrl"
              control={control}
              render={({ field }) => (
                <FileDropzone
                  folder="events"
                  accept={["application/pdf"]}
                  value={field.value}
                  onChange={field.onChange}
                  emptyLabel="Attach results PDF"
                />
              )}
            />
          </SectionCard>
        </TabsContent>

        {/* ── Registration ──────────────────────────── */}
        <TabsContent value="registration" className="mt-5 space-y-5">
          <SectionCard
            title="Registration"
            description="Let members register for this event and choose what details they must provide."
            icon={UserPlus}
            tone="violet"
            action={
              <Controller
                name="registrationEnabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Enable registration"
                  />
                )}
              />
            }
          >
            {!registrationEnabled ? (
              <p className="text-sm text-muted-foreground">
                Registration is off. Turn it on to open a form for athletes and associations — nothing
                below is asked for until you do.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Registration opens" error={errors.registrationOpensAt}>
                    <Controller
                      name="registrationOpensAt"
                      control={control}
                      render={({ field }) => (
                        <DateTimePicker
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? "")}
                          placeholder="No limit"
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Registration closes" error={errors.registrationClosesAt}>
                    <Controller
                      name="registrationClosesAt"
                      control={control}
                      render={({ field }) => (
                        <DateTimePicker
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? "")}
                          placeholder="No limit"
                        />
                      )}
                    />
                  </FormField>
                </div>

                <FormField
                  label="Who can register"
                  error={errors.allowedRegistrants as { message?: string } | undefined}
                >
                  <Controller
                    name="allowedRegistrants"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(["ATHLETE", "ASSOCIATION"] as RegistrantType[]).map((who) => {
                          const checked = field.value.includes(who);
                          return (
                            <label
                              key={who}
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                                checked ? "border-primary/40 bg-primary/5" : "hover:bg-muted/40"
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) =>
                                  field.onChange(
                                    next ? [...field.value, who] : field.value.filter((w) => w !== who)
                                  )
                                }
                              />
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {who === "ATHLETE" ? "Athletes" : "Associations"}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  />
                </FormField>
              </>
            )}
          </SectionCard>

          {registrationEnabled && (
            <>
              <SectionCard
                title="Standard details"
                description="Auto-filled from each registrant's profile — they only review and confirm. Tick what to ask for and what's required."
                icon={ListChecks}
                tone="blue"
              >
                <StandardFieldsEditor
                  value={standardFields}
                  onChange={(v) => setValue("standardFields", v, { shouldDirty: true })}
                />
              </SectionCard>

              <SectionCard
                title="Custom questions"
                description="Event-specific extras. Drag to reorder; keys are generated from the label."
                icon={HelpCircle}
                tone="amber"
              >
                <CustomFieldsEditor control={control} lockedKeys={lockedFieldKeys} />
              </SectionCard>

              <SectionCard
                title="Preview"
                description="What the registrant sees."
                icon={Eye}
                tone="slate"
                collapsible
                defaultOpen={false}
              >
                <RegistrationPreview
                  standardFields={standardFields}
                  fields={registrationFields ?? []}
                />
              </SectionCard>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Save stays reachable from every tab. */}
      <div className="sticky bottom-0 z-10 flex items-center gap-2 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        {TAB_ORDER.some(tabHasError) && (
          <span className="text-sm text-destructive">Some fields need attention.</span>
        )}
      </div>
    </form>
  );
}
