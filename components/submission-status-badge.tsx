import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/types";

const MAP: Record<
  SubmissionStatus,
  { label: string; variant: "secondary" | "info" | "success" | "warning" | "destructive" }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SUBMITTED: { label: "Pending review", variant: "info" },
  RESUBMITTED: { label: "Changes pending", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const s = MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
