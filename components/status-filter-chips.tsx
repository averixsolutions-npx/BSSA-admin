"use client";
import { cn } from "@/lib/utils";
import type { SubmissionStatus } from "@/lib/types";

export type QueueBucket = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT" | "ALL";

export const QUEUE_BUCKETS: {
  key: QueueBucket;
  label: string;
  statuses: SubmissionStatus[] | null; // null = ALL, no filter
}[] = [
  { key: "PENDING", label: "Pending review", statuses: ["SUBMITTED", "RESUBMITTED"] },
  { key: "APPROVED", label: "Approved", statuses: ["APPROVED"] },
  { key: "REJECTED", label: "Rejected", statuses: ["REJECTED"] },
  { key: "DRAFT", label: "Draft", statuses: ["DRAFT"] },
  { key: "ALL", label: "All", statuses: null },
];

interface Props {
  value: QueueBucket;
  onChange: (b: QueueBucket) => void;
  counts?: Partial<Record<QueueBucket, number>>;
}

export function StatusFilterChips({ value, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUEUE_BUCKETS.map((b) => {
        const active = value === b.key;
        const count = counts?.[b.key];
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => onChange(b.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {b.label}
            {typeof count === "number" && count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-primary-foreground/20" : "bg-muted"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
