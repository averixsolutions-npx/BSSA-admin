"use client";
import * as React from "react";
import type { Control } from "react-hook-form";
import { Lock, Pencil, RotateCcw, User, HelpCircle, Sparkles } from "lucide-react";

import type { EventFormValues } from "@/app/(app)/events/event-schema";
import type { StandardFieldsConfig } from "@/lib/types";
import {
  STANDARD_FIELD_ORDER, STANDARD_FIELD_LABELS, DEFAULT_STANDARD_FIELDS,
  READ_ONLY_STANDARD_FIELDS, FIELD_TYPE_LABELS,
} from "@/lib/registration";
import { StandardFieldsEditor } from "@/components/registration/standard-fields-editor";
import { CustomFieldsEditor } from "@/components/registration/custom-fields-editor";
import { RegistrationPreview } from "@/components/registration/registration-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RegistrationFieldValue } from "@/app/(app)/events/event-schema";

// True when the form still matches the untouched default (same shown/required
// standard fields, no custom questions). Drives the "Default / Customized" badge.
export function isDefaultForm(
  standardFields: StandardFieldsConfig,
  fields: RegistrationFieldValue[]
): boolean {
  if (fields.length > 0) return false;
  const keys = Array.from(new Set([
    ...Object.keys(DEFAULT_STANDARD_FIELDS),
    ...Object.keys(standardFields ?? {}),
  ]));
  for (const k of keys) {
    const a = DEFAULT_STANDARD_FIELDS[k as keyof StandardFieldsConfig];
    const b = standardFields?.[k as keyof StandardFieldsConfig];
    if (!!a?.show !== !!b?.show || !!a?.required !== !!b?.required) return false;
  }
  return true;
}

/** Read-only summary of exactly what a registrant will see. No editing here. */
export function RegistrationFormSummary({
  standardFields, fields, onEdit,
}: {
  standardFields: StandardFieldsConfig;
  fields: RegistrationFieldValue[];
  onEdit: () => void;
}) {
  const cfg = { ...DEFAULT_STANDARD_FIELDS, ...standardFields };
  const shownStd = STANDARD_FIELD_ORDER.filter((k) => cfg[k]?.show);
  const isDefault = isDefaultForm(standardFields, fields);
  const empty = shownStd.length === 0 && fields.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={isDefault ? "secondary" : "default"}
            className={cn("gap-1", !isDefault && "bg-violet-500/15 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300")}
          >
            {isDefault ? <Sparkles className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {isDefault ? "Default form" : "Customized"}
          </Badge>
          <span className="text-xs text-muted-foreground">Changes save with the event.</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Customize form
        </Button>
      </div>

      {empty ? (
        // Never a blank void — tell the admin what's wrong and how to fix it.
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          This form has no fields, so registrants would see an empty form.
          <button type="button" onClick={onEdit} className="ml-1 font-medium text-primary hover:underline">
            Add at least one field.
          </button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {shownStd.map((k) => {
            const readOnly = READ_ONLY_STANDARD_FIELDS.includes(k);
            return (
              <li key={k} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{STANDARD_FIELD_LABELS[k]}</span>
                {cfg[k]?.required && <Badge variant="outline" className="font-normal">Required</Badge>}
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  {readOnly && <Lock className="h-3 w-3" />}
                  from profile
                </span>
              </li>
            );
          })}
          {fields.map((f) => (
            <li key={f.key} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{f.label || "Untitled question"}</span>
              {f.required && <Badge variant="outline" className="font-normal">Required</Badge>}
              <Badge variant="secondary" className="font-normal">{FIELD_TYPE_LABELS[f.type]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The only place the form is editable — a focused popup. */
export function RegistrationFormDialog({
  open, onClose, control, standardFields, onStandardChange, registrationFields, lockedFieldKeys, onReset,
}: {
  open: boolean;
  onClose: () => void;
  control: Control<EventFormValues>;
  standardFields: StandardFieldsConfig;
  onStandardChange: (v: StandardFieldsConfig) => void;
  registrationFields: RegistrationFieldValue[];
  lockedFieldKeys: string[];
  onReset: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize the registration form</DialogTitle>
          <DialogDescription>
            Pick which profile details to ask for and add any event-specific questions.
            This is exactly what registrants will see.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-2">
            <h4 className="text-sm font-medium">Standard details</h4>
            <p className="text-xs text-muted-foreground">
              Auto-filled from each registrant's profile — they only review and confirm.
            </p>
            <StandardFieldsEditor value={standardFields} onChange={onStandardChange} />
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-medium">Custom questions</h4>
            <p className="text-xs text-muted-foreground">
              Event-specific extras. Drag to reorder; keys are generated from the label.
            </p>
            <CustomFieldsEditor control={control} lockedKeys={lockedFieldKeys} />
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-medium">Preview</h4>
            <RegistrationPreview standardFields={standardFields} fields={registrationFields ?? []} />
          </section>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={onReset} className="text-muted-foreground">
            <RotateCcw className="h-4 w-4" /> Reset to default
          </Button>
          <Button type="button" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
