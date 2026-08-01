"use client";
import { Ban, ShieldAlert, RotateCcw, Trash2 } from "lucide-react";
import type { AccountStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface Props {
  status: AccountStatus;
  onSuspend: () => void;
  onBlacklist: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  isPending?: boolean;
}

/**
 * Moderation + delete actions for a single athlete/association on their detail
 * page. The visible set depends on the current account status:
 *   ACTIVE      → Suspend, Blacklist, Delete
 *   SUSPENDED   → Reactivate, Blacklist, Delete
 *   BLACKLISTED → Reactivate, Delete
 * Delete is always destructive-styled and pushed to the far end.
 *
 * Renders bare — the caller frames it (a SectionCard on the detail pages).
 */
export function ProfileActionsBar({
  status,
  onSuspend,
  onBlacklist,
  onReactivate,
  onDelete,
  isPending,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "ACTIVE" && (
        <>
          <Button variant="outline" size="sm" onClick={onSuspend} disabled={isPending}>
            <Ban className="mr-2 h-4 w-4" />Suspend
          </Button>
          <Button variant="outline" size="sm" onClick={onBlacklist} disabled={isPending}
            className="text-destructive hover:text-destructive">
            <ShieldAlert className="mr-2 h-4 w-4" />Blacklist
          </Button>
        </>
      )}

      {status === "SUSPENDED" && (
        <>
          <Button variant="outline" size="sm" onClick={onReactivate} disabled={isPending}>
            <RotateCcw className="mr-2 h-4 w-4" />Reactivate
          </Button>
          <Button variant="outline" size="sm" onClick={onBlacklist} disabled={isPending}
            className="text-destructive hover:text-destructive">
            <ShieldAlert className="mr-2 h-4 w-4" />Blacklist
          </Button>
        </>
      )}

      {status === "BLACKLISTED" && (
        <Button variant="outline" size="sm" onClick={onReactivate} disabled={isPending}>
          <RotateCcw className="mr-2 h-4 w-4" />Reactivate
        </Button>
      )}

      <div className="ml-auto" />
      <Button variant="destructive" size="sm" onClick={onDelete} disabled={isPending}>
        <Trash2 className="mr-2 h-4 w-4" />Delete
      </Button>
    </div>
  );
}
