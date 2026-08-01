import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  /** One line saying what goes here. */
  title: string;
  description?: string;
  /** The primary action — usually the same button as the page header's. */
  action?: React.ReactNode;
  /** `inline` drops the dashed border, for use inside a card. */
  variant?: "bordered" | "inline";
  className?: string;
}

/** Every list needs one: icon, one line of what goes here, and the primary action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "bordered",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        variant === "bordered" && "rounded-lg border border-dashed bg-muted/20",
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1 flex items-center gap-2">{action}</div>}
    </div>
  );
}
