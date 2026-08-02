"use client";
import * as React from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, addMonths, setYear, setMonth,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function usePopover() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CalendarHeader({ month, setMonthDate }: { month: Date; setMonthDate: (d: Date) => void }) {
  const years = React.useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 121 }, (_, i) => now - 100 + i); // wide: DOB (past) + events (future)
  }, []);
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <button type="button" className="rounded-md p-1 hover:bg-accent" onClick={() => setMonthDate(addMonths(month, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        <select
          className="rounded-md border bg-background px-1.5 py-1 text-xs"
          value={month.getMonth()}
          onChange={(e) => setMonthDate(setMonth(month, Number(e.target.value)))}
        >
          {Array.from({ length: 12 }, (_, m) => (
            <option key={m} value={m}>{format(setMonth(new Date(), m), "MMM")}</option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-1.5 py-1 text-xs"
          value={month.getFullYear()}
          onChange={(e) => setMonthDate(setYear(month, Number(e.target.value)))}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button type="button" className="rounded-md p-1 hover:bg-accent" onClick={() => setMonthDate(addMonths(month, 1))}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MonthGrid({
  month, selected, onSelect, min, max,
}: {
  month: Date; selected: Date | null; onSelect: (d: Date) => void;
  min?: Date | null; max?: Date | null;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const outOfRange = (d: Date) => {
    const t = dayStart(d);
    if (min && t < dayStart(min)) return true;
    if (max && t > dayStart(max)) return true;
    return false;
  };
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((w) => (
        <div key={w} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{w}</div>
      ))}
      {days.map((d) => {
        const inMonth = isSameMonth(d, month);
        const isSel = selected && isSameDay(d, selected);
        const disabled = outOfRange(d);
        return (
          <button
            key={d.toISOString()}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onSelect(d)}
            className={cn(
              "h-8 w-8 rounded-md text-sm transition-colors",
              !inMonth && "text-muted-foreground/40",
              disabled && "cursor-not-allowed text-muted-foreground/30 line-through",
              isSel ? "bg-primary text-primary-foreground" : !disabled && "hover:bg-accent"
            )}
          >
            {d.getDate()}
          </button>
        );
      })}
    </div>
  );
}

interface BaseProps {
  value?: string | null;                // ISO instant, or "" / null
  onChange: (iso: string | null) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value, onChange, placeholder = "Pick a date", id, disabled, className, min, max,
}: BaseProps & { min?: string | null; max?: string | null }) {
  const { open, setOpen, ref } = usePopover();
  const selected = value ? new Date(value) : null;
  const [month, setMonthDate] = React.useState<Date>(selected ?? new Date());
  return (
    <div className={cn("relative", className)} ref={ref}>
      <Button
        type="button" id={id} variant="outline" disabled={disabled}
        className={cn("w-full justify-start font-normal", !selected && "text-muted-foreground")}
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {selected ? format(selected, "dd MMM yyyy") : placeholder}
      </Button>
      {open && (
        <div className="absolute z-50 mt-2 w-[280px] rounded-lg border bg-popover p-3 shadow-md">
          <CalendarHeader month={month} setMonthDate={setMonthDate} />
          <MonthGrid
            month={month}
            selected={selected}
            min={min ? new Date(min) : null}
            max={max ? new Date(max) : null}
            onSelect={(d) => {
              // Local noon avoids any TZ day-shift for a date-only value.
              const picked = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
              onChange(picked.toISOString());
              setOpen(false);
            }}
          />
          {selected && (
            <button type="button" className="mt-2 w-full text-xs text-muted-foreground hover:underline"
              onClick={() => { onChange(null); setOpen(false); }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DateTimePicker({ value, onChange, placeholder = "Pick date & time", id, disabled, className }: BaseProps) {
  const { open, setOpen, ref } = usePopover();
  const selected = value ? new Date(value) : null;
  const [month, setMonthDate] = React.useState<Date>(selected ?? new Date());
  const hour = selected ? selected.getHours() : 12;
  const minute = selected ? selected.getMinutes() : 0;

  const emit = (d: Date) => onChange(d.toISOString());
  const setDay = (d: Date) => {
    const b = selected ?? new Date();
    emit(new Date(d.getFullYear(), d.getMonth(), d.getDate(), b.getHours(), b.getMinutes(), 0, 0));
  };
  const setTime = (h: number, m: number) => {
    const b = selected ?? new Date();
    emit(new Date(b.getFullYear(), b.getMonth(), b.getDate(), h, m, 0, 0));
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <Button
        type="button" id={id} variant="outline" disabled={disabled}
        className={cn("w-full justify-start font-normal", !selected && "text-muted-foreground")}
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {selected ? format(selected, "dd MMM yyyy, HH:mm") : placeholder}
      </Button>
      {open && (
        <div className="absolute z-50 mt-2 w-[280px] rounded-lg border bg-popover p-3 shadow-md">
          <CalendarHeader month={month} setMonthDate={setMonthDate} />
          <MonthGrid month={month} selected={selected} onSelect={setDay} />
          <div className="mt-3 flex items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">Time</span>
            <select className="rounded-md border bg-background px-1.5 py-1 text-xs" value={hour}
              onChange={(e) => setTime(Number(e.target.value), minute)}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
            </select>
            <span>:</span>
            <select className="rounded-md border bg-background px-1.5 py-1 text-xs" value={minute}
              onChange={(e) => setTime(hour, Number(e.target.value))}>
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
            </select>
            <button type="button" className="ml-auto text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
