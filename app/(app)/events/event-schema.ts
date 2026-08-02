import { z } from "zod";

export const REGISTRATION_FIELD_TYPES = ["text", "number", "select", "date", "checkbox"] as const;

const standardFieldConfig = z.object({ show: z.boolean(), required: z.boolean() });

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  venue: z.string().trim().min(1, "Venue is required").max(200),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  disciplineTag: z.string().trim().max(60).optional().or(z.literal("")),
  // Dates are ISO instant strings emitted by DateTimePicker.
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  resultsPdfUrl: z.string().url().nullable().optional(),
  registrationEnabled: z.boolean().default(false),
  registrationOpensAt: z.string().optional().or(z.literal("")),
  registrationClosesAt: z.string().optional().or(z.literal("")),
  allowedRegistrants: z.array(z.enum(["ATHLETE", "ASSOCIATION"])).default([]),
  standardFields: z.record(standardFieldConfig).default({}),
  registrationFields: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1, "Label is required").max(120),
        type: z.enum(REGISTRATION_FIELD_TYPES),
        required: z.boolean().default(false),
        options: z.array(z.string().trim().min(1)).default([]), // chips, for type=select
        helpText: z.string().trim().max(200).optional().or(z.literal("")),
      })
    )
    .default([]),
}).superRefine((v, ctx) => {
  // Compare by calendar day (the pickers are date-only), ignoring blanks.
  const day = (s?: string) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  if (!v.registrationEnabled) return; // nothing to check when registration is off

  const end = day(v.endDate);
  const opens = day(v.registrationOpensAt);
  const closes = day(v.registrationClosesAt);

  if (opens !== null && closes !== null && closes < opens) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["registrationClosesAt"],
      message: "This is before registration opens — pick a later date.",
    });
  }
  if (end !== null) {
    if (opens !== null && opens > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationOpensAt"],
        message: "Registration can't open after the event ends.",
      });
    }
    if (closes !== null && closes > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationClosesAt"],
        message: "Registration can't close after the event ends.",
      });
    }
  }
});

export type EventFormValues = z.infer<typeof eventSchema>;
export type RegistrationFieldValue = EventFormValues["registrationFields"][number];

// Normalise the registration part into the API shape. Options only travel for
// select fields; empty helpText is dropped.
export function toRegistrationInput(v: EventFormValues) {
  return {
    registrationEnabled: v.registrationEnabled,
    registrationOpensAt: v.registrationOpensAt || undefined,
    registrationClosesAt: v.registrationClosesAt || undefined,
    allowedRegistrants: v.allowedRegistrants,
    standardFields: v.standardFields,
    registrationFields: v.registrationFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      ...(f.helpText ? { helpText: f.helpText } : {}),
      ...(f.type === "select" ? { options: f.options.filter(Boolean) } : {}),
    })),
  };
}
