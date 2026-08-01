"use client";
import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Section tints are *identity*, not decoration — a concept keeps its colour
 * across screens (events are always blue, registration always violet, and so
 * on), so the eye can jump to a section instead of reading top to bottom.
 * Every tone is checked against both themes.
 */
export const SECTION_TONES = {
  blue: "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400",
  slate: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300",
} as const;

export type SectionTone = keyof typeof SECTION_TONES;

interface SectionCardProps {
  title: string;
  description?: React.ReactNode;
  icon: LucideIcon;
  tone?: SectionTone;
  /** Rendered at the far end of the header — buttons, badges, a switch. */
  action?: React.ReactNode;
  /** When set, the header doubles as a disclosure toggle for the body. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  tone = "blue",
  action,
  collapsible,
  defaultOpen = true,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const tile = (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
        SECTION_TONES[tone]
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );

  const heading = (
    <div className="min-w-0 flex-1 text-left">
      <h3 className="font-semibold leading-tight">{title}</h3>
      {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
    </div>
  );

  if (!collapsible) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-5">
          {tile}
          {heading}
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </CardHeader>
        <CardContent className={cn("space-y-5 p-5 pt-0", contentClassName)}>{children}</CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-5">
          {/* Only the title block is the trigger — `action` may hold its own buttons. */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-4 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {tile}
              {heading}
              <ChevronDown
                className={cn(
                  "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className={cn("space-y-5 p-5 pt-0", contentClassName)}>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
