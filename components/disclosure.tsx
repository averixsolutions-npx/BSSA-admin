"use client";
import * as React from "react";
import { ChevronDown, AlertCircle } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface DisclosureProps {
  /** Says what is hidden, e.g. "Add optional details" — never "Show more". */
  label: string;
  /** Label once open. Defaults to `Hide …`. */
  openLabel?: string;
  /** How many things are behind the toggle. Rendered as `label (count)`. */
  count?: number;
  /** Start expanded — use when something inside already has a value. */
  defaultOpen?: boolean;
  /**
   * Force the panel open and flag the header. A collapsed section must never
   * conceal a validation error (P2).
   */
  forceOpen?: boolean;
  /** Shown next to the label when `forceOpen` is set. */
  forceOpenReason?: string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function Disclosure({
  label,
  openLabel,
  count,
  defaultOpen = false,
  forceOpen = false,
  forceOpenReason = "Needs attention",
  className,
  contentClassName,
  children,
}: DisclosureProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const isOpen = open || forceOpen;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(next) => {
        if (forceOpen) return; // can't close over an error
        setOpen(next);
      }}
      className={cn("space-y-3", className)}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          disabled={forceOpen}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            forceOpen
              ? "cursor-default text-destructive"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {forceOpen ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            />
          )}
          {forceOpen
            ? `${label} — ${forceOpenReason}`
            : isOpen
            ? openLabel ?? `Hide ${label.charAt(0).toLowerCase()}${label.slice(1)}`
            : typeof count === "number" && count > 0
            ? `${label} (${count})`
            : label}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className={contentClassName}>{children}</CollapsibleContent>
    </Collapsible>
  );
}
