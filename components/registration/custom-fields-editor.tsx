"use client";
import * as React from "react";
import {
  useFieldArray, Controller,
  type Control, type UseFormRegister, type UseFormWatch, type UseFormSetValue,
} from "react-hook-form";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Lock, X, Plus } from "lucide-react";

import type { EventFormValues } from "@/app/(app)/events/event-schema";
import { FIELD_TYPE_LABELS, FIELD_TYPE_ORDER, slugifyKey, uniqueKey } from "@/lib/registration";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface Props {
  control: Control<EventFormValues>;
  register: UseFormRegister<EventFormValues>;
  watch: UseFormWatch<EventFormValues>;
  setValue: UseFormSetValue<EventFormValues>;
  lockedKeys: string[]; // keys that already have stored answers — cannot rename/remove
}

export function CustomFieldsEditor({ control, register, watch, setValue, lockedKeys }: Props) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "registrationFields" });
  const rows = watch("registrationFields");

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

  function addBlank() {
    append({ key: "", label: "", type: "text", required: false, options: [], helpText: "" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Custom questions</p>
          <p className="text-xs text-muted-foreground">
            Event-specific extras. Type a label — the storage key is generated for you.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addBlank}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          No custom questions — registrants only confirm their standard details.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <FieldRow
                  key={f.id}
                  id={f.id}
                  index={i}
                  register={register}
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  remove={() => remove(i)}
                  locked={lockedKeys.includes(rows?.[i]?.key ?? "")}
                  siblingKeys={(rows ?? []).map((r) => r.key).filter((_, idx) => idx !== i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function FieldRow({
  id, index, register, control, watch, setValue, remove, locked, siblingKeys,
}: {
  id: string;
  index: number;
  register: UseFormRegister<EventFormValues>;
  control: Control<EventFormValues>;
  watch: UseFormWatch<EventFormValues>;
  setValue: UseFormSetValue<EventFormValues>;
  remove: () => void;
  locked: boolean;
  siblingKeys: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  const type = watch(`registrationFields.${index}.type`);
  const key = watch(`registrationFields.${index}.key`);

  // Auto-generate the key from the label for NEW (unlocked) fields.
  function onLabelChange(label: string) {
    setValue(`registrationFields.${index}.label`, label, { shouldDirty: true });
    if (!locked) {
      const next = uniqueKey(slugifyKey(label), siblingKeys);
      setValue(`registrationFields.${index}.key`, next, { shouldDirty: true });
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1.5 cursor-grab text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
            <Input
              placeholder="Label (e.g. Age Category)"
              defaultValue={watch(`registrationFields.${index}.label`)}
              onChange={(e) => onLabelChange(e.target.value)}
              className="h-8 text-sm"
            />
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              {...register(`registrationFields.${index}.type`)}
            >
              {FIELD_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Controller
                name={`registrationFields.${index}.required`}
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Required" />
                )}
              />
              Required
            </label>
          </div>

          <Input
            placeholder="Helper text (optional)"
            {...register(`registrationFields.${index}.helpText`)}
            className="h-8 text-xs"
          />

          {type === "select" && (
            <OptionsEditor index={index} control={control} />
          )}

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {locked && <Lock className="h-3 w-3" />}
            <span className="font-mono">key: {key || "…"}</span>
            {locked && <span>· locked (has registrations)</span>}
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive"
          onClick={remove}
          disabled={locked}
          title={locked ? "Can't delete — this question already has answers" : "Delete question"}
        >
          {locked ? <Lock className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

// Chip-based options editor for dropdown fields.
function OptionsEditor({ index, control }: { index: number; control: Control<EventFormValues> }) {
  const [draft, setDraft] = React.useState("");
  return (
    <Controller
      name={`registrationFields.${index}.options`}
      control={control}
      render={({ field }) => {
        const opts: string[] = field.value ?? [];
        const add = () => {
          const v = draft.trim();
          if (v && !opts.includes(v)) field.onChange([...opts, v]);
          setDraft("");
        };
        return (
          <div className="rounded-md border bg-background p-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {opts.length === 0 && <span className="text-[11px] text-muted-foreground">No options yet.</span>}
              {opts.map((o) => (
                <span key={o} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {o}
                  <button type="button" onClick={() => field.onChange(opts.filter((x) => x !== o))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                placeholder="Add option and press Enter"
                className="h-8 text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={add}>Add</Button>
            </div>
          </div>
        );
      }}
    />
  );
}
