"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock, FileText, Info, ListChecks,
  Loader2, Send, UserPlus, Users,
} from "lucide-react";
import { toast } from "sonner";

import type { Event, RegistrantType } from "@/lib/types";
import { eventSchema, type EventFormValues } from "./event-schema";
import { disciplinesService } from "@/lib/services/disciplines";
import { FormField } from "@/components/form-field";
import { FileDropzone } from "@/components/file-dropzone";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { DEFAULT_STANDARD_FIELDS } from "@/lib/registration";
import {
  RegistrationFormSummary,
  RegistrationFormDialog,
} from "@/components/registration/registration-form-editor";
import { cn } from "@/lib/utils";

// Sentinel for "no discipline tag" — Radix Select can't carry an empty-string value.
const NO_DISCIPLINE = "__none__";

export { toRegistrationInput, type EventFormValues } from "./event-schema";

// Publishing sits last — it's the one step that only makes sense once
// everything else is decided.
type TabKey = "details" | "schedule" | "registration" | "publishing";

// Which step owns which field — drives the error dot on the step chip and
// blocks "Next" until the current step is actually valid.
const TAB_FIELDS: Record<TabKey, readonly (keyof EventFormValues)[]> = {
  details: ["title", "venue", "address", "disciplineTag", "description"],
  schedule: ["startDate", "endDate"],
  registration: [
    "registrationOpensAt", "registrationClosesAt", "allowedRegistrants",
    "standardFields", "registrationFields",
  ],
  publishing: ["resultsPdfUrl"],
};

const TAB_ORDER: TabKey[] = ["details", "schedule", "registration", "publishing"];
const TAB_LABELS: Record<TabKey, string> = {
  details: "Details",
  schedule: "Schedule",
  registration: "Registration",
  publishing: "Publishing",
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
  // A brand-new event walks step by step; an existing one already has data on
  // every step, so it stays freely browsable.
  const isCreating = !initialValues?.id;

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
      // Seed the concrete default form. An empty object would mean "no fields",
      // so a fresh event starts from the real default (name/email/contact/BSSA ID).
      standardFields:
        initialValues?.standardFields && Object.keys(initialValues.standardFields).length > 0
          ? initialValues.standardFields
          : DEFAULT_STANDARD_FIELDS,
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
  const { register, control, watch, setValue, handleSubmit, trigger, formState: { errors } } = form;

  const [tab, setTab] = React.useState<TabKey>("details");
  // Highest step index reached — in create mode this is the wall that keeps a
  // step chip locked until everything before it is valid.
  const [maxStepIndex, setMaxStepIndex] = React.useState(0);
  const [formEditorOpen, setFormEditorOpen] = React.useState(false);

  const registrationEnabled = watch("registrationEnabled");
  const standardFields = watch("standardFields");
  const registrationFields = watch("registrationFields");
  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const { data: disciplines = [], isLoading: disciplinesLoading } = useQuery({
    queryKey: ["disciplines", "list"],
    queryFn: () => disciplinesService.list(),
  });

  const tabHasError = (key: TabKey) => TAB_FIELDS[key].some((field) => !!errors[field]);

  const currentIndex = TAB_ORDER.indexOf(tab);
  const isLastStep = currentIndex === TAB_ORDER.length - 1;

  const onInvalid = () => {
    const firstBadTab = TAB_ORDER.find((key) => TAB_FIELDS[key].some((f) => !!errors[f]));
    if (firstBadTab) setTab(firstBadTab);
    toast.error("Check the highlighted fields", {
      description: firstBadTab ? `Something needs fixing on ${TAB_LABELS[firstBadTab]}.` : undefined,
    });
  };

  // "Next" only validates the fields that live on the current step, so an
  // error further down the form never blocks progress on the step you're on.
  const handleNext = async () => {
    const ok = await trigger(TAB_FIELDS[tab] as (keyof EventFormValues)[]);
    if (!ok) {
      toast.error("Check the highlighted fields", {
        description: `Something needs fixing on ${TAB_LABELS[tab]} before you can continue.`,
      });
      return;
    }
    const next = TAB_ORDER[currentIndex + 1];
    if (next) {
      setMaxStepIndex((i) => Math.max(i, currentIndex + 1));
      setTab(next);
    }
  };

  const handleBack = () => {
    const prev = TAB_ORDER[currentIndex - 1];
    if (prev) setTab(prev);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="max-w-3xl space-y-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="h-auto w-full items-stretch justify-between gap-1.5 rounded-none bg-transparent p-0 sm:gap-2">
          {TAB_ORDER.map((key, i) => {
            const locked = isCreating && i > maxStepIndex;
            const done = i < currentIndex;
            return (
              <TabsTrigger
                key={key}
                value={key}
                disabled={locked}
                title={locked ? "Finish the previous step first" : undefined}
                className={cn(
                  "group flex flex-1 flex-col items-center gap-1.5 rounded-lg border bg-card px-2 py-2.5 text-center",
                  "shadow-none transition-colors data-[state=active]:shadow-sm",
                  "data-[state=active]:border-primary data-[state=active]:bg-primary/5",
                  locked ? "cursor-not-allowed opacity-40" : "hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : tab === key
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium">
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
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Details ───────────────────────────────── */}
        <TabsContent value="details" className="mt-5 space-y-5 slide-in-from-right-1">
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

            <FormField label="Address" error={errors.address} hint="Full postal address, if you have one.">
              <Input {...register("address")} />
            </FormField>

            <FormField label="Discipline tag" error={errors.disciplineTag}
              hint={disciplines.length === 0 ? "No disciplines set up yet — add one under Disciplines first." : undefined}>
              <Controller
                name="disciplineTag"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NO_DISCIPLINE}
                    onValueChange={(v) => field.onChange(v === NO_DISCIPLINE ? "" : v)}
                    disabled={disciplinesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={disciplinesLoading ? "Loading disciplines…" : "Select a discipline"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DISCIPLINE}>No discipline tag</SelectItem>
                      {disciplines.map((d) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
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
        <TabsContent value="schedule" className="mt-5 space-y-5 slide-in-from-right-1">
          <SectionCard
            title="When it runs"
            description="Both are required — the public calendar sorts on them."
            icon={Clock}
            tone="green"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Start date" required error={errors.startDate}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? "")}
                      max={endDate || undefined}
                    />
                  )}
                />
              </FormField>
              <FormField label="End date" required error={errors.endDate} hint="On or after the start date.">
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? "")}
                      min={startDate || undefined}
                    />
                  )}
                />
              </FormField>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Registration ──────────────────────────── */}
        <TabsContent value="registration" className="mt-5 space-y-5 slide-in-from-right-1">
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
                  <FormField label="Registration opens" error={errors.registrationOpensAt}
                    hint="On or before the event ends. Leave blank for no limit.">
                    <Controller
                      name="registrationOpensAt"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? "")}
                          placeholder="No limit"
                          max={endDate || undefined}
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Registration closes" error={errors.registrationClosesAt}
                    hint="Must be on or after it opens, and by the event's end date.">
                    <Controller
                      name="registrationClosesAt"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? "")}
                          placeholder="No limit"
                          max={endDate || undefined}
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
                title="Registration form"
                description="What every registrant sees. Fixed by default — open it to change the fields."
                icon={ListChecks}
                tone="blue"
              >
                <RegistrationFormSummary
                  standardFields={standardFields}
                  fields={registrationFields ?? []}
                  onEdit={() => setFormEditorOpen(true)}
                />
              </SectionCard>

              <RegistrationFormDialog
                open={formEditorOpen}
                onClose={() => setFormEditorOpen(false)}
                control={control}
                standardFields={standardFields}
                onStandardChange={(v) => setValue("standardFields", v, { shouldDirty: true })}
                registrationFields={registrationFields ?? []}
                lockedFieldKeys={lockedFieldKeys}
                onReset={() => {
                  setValue("standardFields", DEFAULT_STANDARD_FIELDS, { shouldDirty: true });
                  setValue("registrationFields", [], { shouldDirty: true });
                }}
              />
            </>
          )}
        </TabsContent>

        {/* ── Publishing ────────────────────────────── */}
        <TabsContent value="publishing" className="mt-5 space-y-5 slide-in-from-right-1">
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
      </Tabs>

      {/* Step nav stays reachable from every step — Next until the last step, then submit. */}
      <div className="sticky bottom-0 z-10 flex items-center gap-2 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-card/80">
        {currentIndex > 0 && (
          <Button type="button" variant="outline" onClick={handleBack} disabled={submitting}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        )}

        {!isLastStep ? (
          <Button type="button" onClick={handleNext} disabled={submitting}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        )}

        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>

        {TAB_ORDER.some(tabHasError) && (
          <span className="text-sm text-destructive">Some fields need attention.</span>
        )}
      </div>
    </form>
  );
}
