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

interface ModerationDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** The target status we're moving TO. */
  action: "SUSPENDED" | "BLACKLISTED" | null;
  subjectName: string;
  onConfirm: (reason: string) => Promise<void>;
}

export function ModerationDialog({ open, onOpenChange, action, subjectName, onConfirm }: ModerationDialogProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  // Clear the field whenever the dialog (re)opens.
  useEffect(() => { if (open) setReason(""); }, [open]);

  const isBlacklist = action === "BLACKLISTED";
  const verb = isBlacklist ? "Blacklist" : "Suspend";

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setPending(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{verb} {subjectName}?</DialogTitle>
          <DialogDescription>
            {isBlacklist
              ? "This blocks the account from logging in and hides it from the public site. Intended as permanent."
              : "This blocks the account from logging in and hides it from the public site until reactivated."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Reason (shown to the user)</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Pending eligibility review"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending || !reason.trim()}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
