import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/lib/types";

const MAP: Record<AccountStatus, { label: string; variant: "secondary" | "warning" | "destructive" }> = {
  ACTIVE: { label: "Active", variant: "secondary" },
  SUSPENDED: { label: "Suspended", variant: "warning" },
  BLACKLISTED: { label: "Blacklisted", variant: "destructive" },
};

export function AccountStatusBadge({ status }: { status?: AccountStatus }) {
  const s = MAP[status ?? "ACTIVE"];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
