"use client";
import { format } from "date-fns";
import { Mail, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Enquiry } from "@/lib/types";

export function EnquiryDetailDialog({
  enquiry,
  onOpenChange,
  onDelete,
}: {
  enquiry: Enquiry | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (enquiry: Enquiry) => void;
}) {
  return (
    <Dialog open={!!enquiry} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {enquiry && (
          <>
            <DialogHeader>
              <DialogTitle>{enquiry.name}</DialogTitle>
              <DialogDescription>
                Received {format(new Date(enquiry.createdAt), "d MMM yyyy, h:mm a")}
                {enquiry.sourcePage ? ` · from ${enquiry.sourcePage}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-muted-foreground">Email</span>
                <a className="font-medium hover:underline" href={`mailto:${enquiry.email}`}>
                  {enquiry.email}
                </a>
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{enquiry.phone ?? "—"}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-muted-foreground">Message</span>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 leading-relaxed">
                  {enquiry.message}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="destructive" onClick={() => onDelete(enquiry)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
              <Button asChild>
                <a href={`mailto:${enquiry.email}`}>
                  <Mail className="mr-2 h-4 w-4" /> Reply
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
