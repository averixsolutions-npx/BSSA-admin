"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { VerificationStatus } from "@/lib/types";

interface DocumentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectLabel: string;
  onSubmit: (status: VerificationStatus, reviewNote?: string) => Promise<unknown>;
  /** When true, the Approve button is hidden — dialog is purely for capturing a reject reason. */
  rejectOnly?: boolean;
  /** Preset templates shown as chips above the textarea. */
  templates?: string[];
}

export function DocumentReviewDialog({
  open,
  onOpenChange,
  subjectLabel,
  onSubmit,
  rejectOnly,
  templates,
}: DocumentReviewDialogProps) {
  const [reviewNote, setReviewNote] = useState("");
  const [pending, setPending] = useState<VerificationStatus | null>(null);

  useEffect(() => { if (open) setReviewNote(""); }, [open]);

  const handle = async (status: VerificationStatus) => {
    if (status === "REJECTED" && !reviewNote.trim()) return;
    setPending(status);
    try {
      await onSubmit(status, reviewNote.trim() || undefined);
      onOpenChange(false);
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rejectOnly ? `Reject ${subjectLabel}` : `Review ${subjectLabel}`}</DialogTitle>
          <DialogDescription>
            {rejectOnly
              ? "Give a reason the user can act on — this is shown to them."
              : "Approve if the document is valid and legible, or reject with a note the athlete can act on."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {templates && templates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReviewNote(t)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <label className="text-sm font-medium">Note (required if rejecting)</label>
          <Textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="e.g. Image is blurry — please re-upload a clearer scan"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!pending}>Cancel</Button>
          <Button variant="destructive" onClick={() => handle("REJECTED")} disabled={!!pending || !reviewNote.trim()}>
            {pending === "REJECTED" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject
          </Button>
          {!rejectOnly && (
            <Button onClick={() => handle("APPROVED")} disabled={!!pending}>
              {pending === "APPROVED" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
