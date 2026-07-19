import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "@/lib/types";

const MAP: Record<VerificationStatus, { label: string; variant: "warning" | "success" | "destructive" }> = {
  PENDING: { label: "Pending review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export function DocumentStatusBadge({ status }: { status: VerificationStatus }) {
  const s = MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
