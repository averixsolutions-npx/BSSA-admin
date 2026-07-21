"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentReviewDialog } from "@/components/document-review-dialog";
import { PROFILE_REJECTION_TEMPLATES } from "@/components/rejection-templates";
import type { SubmissionStatus, VerificationStatus } from "@/lib/types";

interface Props {
  status: SubmissionStatus;
  /** Only relevant when status === "SUBMITTED" or "RESUBMITTED". */
  canApprove: boolean;
  /** Shown as a small hint when canApprove is false. */
  blockedReason?: string;
  subjectLabel: string; // "Alice Kumar" or "Delhi Ski Association"
  onApprove: () => Promise<unknown>;
  onReject: (reviewNote: string) => Promise<unknown>;
  isPending?: boolean;
}

export function ApproveRejectBar({
  status,
  canApprove,
  blockedReason,
  subjectLabel,
  onApprove,
  onReject,
  isPending,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);

  // No actions available in these states — the bar renders nothing.
  if (status === "DRAFT" || status === "APPROVED") return null;

  const isReview = status === "SUBMITTED" || status === "RESUBMITTED";
  const isRejected = status === "REJECTED";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
      <div className="mr-auto">
        <p className="text-sm font-semibold">
          {status === "SUBMITTED" && "Awaiting first review"}
          {status === "RESUBMITTED" && "Changes since last approval"}
          {isRejected && "Rejected — awaiting user's resubmission"}
        </p>
        {!canApprove && blockedReason && isReview && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <Info className="h-3.5 w-3.5" /> {blockedReason}
          </p>
        )}
      </div>

      {isReview && (
        <>
          <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={isPending}>
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button onClick={onApprove} disabled={!canApprove || isPending}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
          </Button>
        </>
      )}

      <DocumentReviewDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        subjectLabel={subjectLabel}
        rejectOnly
        templates={PROFILE_REJECTION_TEMPLATES}
        onSubmit={async (statusFromDialog: VerificationStatus, reviewNote?: string) => {
          if (statusFromDialog !== "REJECTED" || !reviewNote) return;
          await onReject(reviewNote);
        }}
      />
    </div>
  );
}
