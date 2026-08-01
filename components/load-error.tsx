"use client";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** A record that wouldn't load — states what failed and offers the way back. */
export function LoadError({
  title,
  description = "It may have been deleted, or the API is unreachable.",
  backLabel,
  onBack,
}: {
  title: string;
  description?: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <Alert variant="destructive">
        <AlertTriangle />
        <div className="space-y-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </div>
      </Alert>
      <Button variant="outline" onClick={onBack}>{backLabel}</Button>
    </div>
  );
}
