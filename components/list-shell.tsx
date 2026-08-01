"use client";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";

interface Props {
  isLoading?: boolean;
  isError?: boolean;
  /** e.g. "Couldn't load hero slides" — says what failed, not just "Error". */
  errorTitle?: string;
  isEmpty?: boolean;
  empty: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  children: React.ReactNode;
}

/**
 * The loading / failed / empty / loaded states of a non-tabular list, so every
 * screen answers "why is nothing here?" the same way.
 */
export function ListShell({ isLoading, isError, errorTitle, isEmpty, empty, children }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <div className="space-y-1">
          <AlertTitle>{errorTitle ?? "Couldn't load this list"}</AlertTitle>
          <AlertDescription>Refresh the page to try again.</AlertDescription>
        </div>
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  }

  return <>{children}</>;
}
