"use client";
import * as React from "react";
import { useFieldArray, useWatch, type Control } from "react-hook-form";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Lock, X, Plus, Pencil, HelpCircle, ChevronDown } from "lucide-react";

import type { EventFormValues, RegistrationFieldValue } from "@/app/(app)/events/event-schema";
import {
  FIELD_TYPE_LABELS, FIELD_TYPE_ORDER, FIELD_PRESETS, slugifyKey, uniqueKey,
} from "@/lib/registration";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Rows shown before the list folds behind "Show N more". */
const COLLAPSE_AFTER = 4;
const VISIBLE_WHEN_COLLAPSED = 3;

const BLANK: RegistrationFieldValue = {
  key: "", label: "", type: "text", required: false, options: [], helpText: "",
};

interface Props {
  control: Control<EventFormValues>;
  lockedKeys: string[]; // keys that already have stored answers — cannot rename/remove
}

/**
 * A collection is a list of rows plus an Add button; the editor for a row lives
 * in a dialog (P3). An always-open form per question scrolled forever and made
 * every question look like a decision the operator had to make right now.
 */
export function CustomFieldsEditor({ control, lockedKeys }: Props) {
  const { fields, append, remove, move, update } = useFieldArray({ control, name: "registrationFields" });
  const rows = (useWatch({ control, name: "registrationFields" }) ?? []) as RegistrationFieldValue[];

  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  const collapsed = !showAll && fields.length > COLLAPSE_AFTER;
  const visible = collapsed ? fields.slice(0, VISIBLE_WHEN_COLLAPSED) : fields;
  const hiddenCount = fields.length - visible.length;

  const siblingKeysFor = (index: number | null) =>
    rows.filter((_, i) => i !== index).map((r) => r.key);

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No custom questions"
          description="Registrants will only confirm their standard details. Add a question to ask for anything event-specific."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Add question
            </Button>
          }
        />
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={visible.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {visible.map((f, i) => (
                  <FieldRow
                    key={f.id}
                    id={f.id}
                    value={rows[i] ?? (f as unknown as RegistrationFieldValue)}
                    locked={lockedKeys.includes(rows[i]?.key ?? "")}
                    onEdit={() => setEditingIndex(i)}
                    onRemove={() => remove(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" />
              Show {hiddenCount} more question{hiddenCount === 1 ? "" : "s"}
            </button>
          )}

          <Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add question
          </Button>
        </>
      )}

      {creating && (
        <FieldDialog
          mode="create"
          initial={BLANK}
          siblingKeys={siblingKeysFor(null)}
          onClose={() => setCreating(false)}
          onSave={(v) => {
            append(v);
            setCreating(false);
            setShowAll(true);
          }}
        />
      )}

      {editingIndex !== null && rows[editingIndex] && (
        <FieldDialog
          mode="edit"
          initial={rows[editingIndex]}
          locked={lockedKeys.includes(rows[editingIndex].key)}
          siblingKeys={siblingKeysFor(editingIndex)}
          onClose={() => setEditingIndex(null)}
          onSave={(v) => {
            update(editingIndex, v);
            setEditingIndex(null);
          }}
        />
      )}
    </div>
  );
}

// ── One row in the list ──

function FieldRow({
  id, value, locked, onEdit, onRemove,
}: {
  id: string;
  value: RegistrationFieldValue;
  locked: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-muted/40"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{value.label || "Untitled question"}</p>
          <Badge variant="secondary" className="font-normal">{FIELD_TYPE_LABELS[value.type]}</Badge>
          {value.required && <Badge variant="outline" className="font-normal">Required</Badge>}
          {locked && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> locked
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {value.key || "…"}
          {value.type === "select" && ` · ${(value.options ?? []).length} option(s)`}
          {value.helpText ? ` · ${value.helpText}` : ""}
        </p>
      </div>

      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Edit question">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn("h-8 w-8", !locked && "text-destructive")}
        onClick={onRemove}
        disabled={locked}
        title={locked ? "Can't delete — this question already has answers" : "Delete question"}
      >
        {locked ? <Lock className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

// ── Add / edit dialog ──
// State is local and seeded once on mount; the dialog is conditionally rendered
// by the parent so re-opening starts fresh. No effect is keyed on a callback
// prop, which is what makes typing here safe.

function FieldDialog({
  mode, initial, locked = false, siblingKeys, onSave, onClose,
}: {
  mode: "create" | "edit";
  initial: RegistrationFieldValue;
  locked?: boolean;
  siblingKeys: string[];
  onSave: (value: RegistrationFieldValue) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState<RegistrationFieldValue>(() => ({
    ...initial,
    options: initial.options ?? [],
    helpText: initial.helpText ?? "",
  }));
  const [optionDraft, setOptionDraft] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const set = <K extends keyof RegistrationFieldValue>(key: K, value: RegistrationFieldValue[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const labelError = touched && !draft.label.trim() ? "Give the question a label" : undefined;
  // The storage key follows the label while the field is still editable; once a
  // registration has answered it the key is frozen (answers are stored by key).
  const nextKey = locked ? draft.key : uniqueKey(slugifyKey(draft.label), siblingKeys);

  const addOption = () => {
    const v = optionDraft.trim();
    if (v && !(draft.options ?? []).includes(v)) set("options", [...(draft.options ?? []), v]);
    setOptionDraft("");
  };

  const submit = () => {
    setTouched(true);
    if (!draft.label.trim()) return;
    onSave({
      ...draft,
      label: draft.label.trim(),
      key: nextKey,
      helpText: draft.helpText?.trim() ?? "",
      options: draft.type === "select" ? (draft.options ?? []) : [],
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add a question" : "Edit question"}</DialogTitle>
          <DialogDescription>
            Asked once, at registration. The storage key is generated from the label.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "create" && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Start from a preset
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {FIELD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      setDraft({
                        key: "",
                        label: p.label,
                        type: p.type,
                        required: p.required ?? false,
                        options: p.options ?? [],
                        helpText: p.helpText ?? "",
                      })
                    }
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="field-label" className="flex items-center gap-1">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="field-label"
              autoFocus
              value={draft.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. Age category"
            />
            {labelError && <p className="text-xs text-destructive">{labelError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="field-type">Answer type</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => set("type", v as RegistrationFieldValue["type"])}
              >
                <SelectTrigger id="field-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-required">Required</Label>
              <div className="flex h-10 items-center">
                <Switch
                  id="field-required"
                  checked={draft.required}
                  onCheckedChange={(v) => set("required", v)}
                />
              </div>
            </div>
          </div>

          {draft.type === "select" && (
            <div className="space-y-2">
              <Label>Dropdown options</Label>
              <div className="rounded-md border p-2">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(draft.options ?? []).length === 0 && (
                    <span className="text-xs text-muted-foreground">No options yet.</span>
                  )}
                  {(draft.options ?? []).map((o) => (
                    <span key={o} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      {o}
                      <button
                        type="button"
                        aria-label={`Remove ${o}`}
                        onClick={() => set("options", (draft.options ?? []).filter((x) => x !== o))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={optionDraft}
                    onChange={(e) => setOptionDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                    placeholder="Add an option and press Enter"
                    className="h-9 text-sm"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addOption}>Add</Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="field-help">Helper text</Label>
            <Input
              id="field-help"
              value={draft.helpText ?? ""}
              onChange={(e) => set("helpText", e.target.value)}
              placeholder="Optional — shown under the field"
            />
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {locked && <Lock className="h-3 w-3" />}
            <span className="font-mono">key: {nextKey || "…"}</span>
            {locked && <span>· locked, this question already has answers</span>}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={submit}>
            {mode === "create" ? "Add question" : "Save question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
