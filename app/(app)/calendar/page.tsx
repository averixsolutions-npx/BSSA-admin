"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

import { calendarService } from "@/lib/services/calendar";
import type { CalendarEntry } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListShell } from "@/components/list-shell";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CalendarListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<CalendarEntry | null>(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["calendar", "list"],
    queryFn: () => calendarService.list(),
  });

  const publishM = useMutation({
    mutationFn: (id: string) => calendarService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast.success("Entry published"); },
    onError: (e) => toast.error("Couldn't publish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const unpublishM = useMutation({
    mutationFn: (id: string) => calendarService.unpublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast.success("Entry unpublished"); },
    onError: (e) => toast.error("Couldn't unpublish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => calendarService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast.success("Entry deleted"); setPendingDelete(null); },
    onError: (e) => toast.error("Couldn't delete", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Simple dated entries (name, date, location) for the public Events & Calendar page."
        action={<Button onClick={() => router.push("/calendar/new")}><Plus className="h-4 w-4" />New entry</Button>}
      />

      <ListShell
        isLoading={isLoading}
        isError={isError}
        errorTitle="Couldn't load calendar"
        isEmpty={items.length === 0}
        empty={{
          icon: Calendar,
          title: "No calendar entries yet",
          description: "Add name, date and location — published entries appear in the site calendar.",
          action: (
            <Button size="sm" onClick={() => router.push("/calendar/new")}>
              <Plus className="h-4 w-4" />Add the first entry
            </Button>
          ),
        }}
      >
        <div className="space-y-2">
          {items.map((c) => {
            const pub = c.status === "PUBLISHED";
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{fmtDate(c.eventDate)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>
                  </p>
                </div>
                <StatusBadge status={c.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/calendar/${c.id}`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                    {pub
                      ? <DropdownMenuItem onClick={() => unpublishM.mutate(c.id)}><EyeOff className="mr-2 h-4 w-4" />Unpublish</DropdownMenuItem>
                      : <DropdownMenuItem onClick={() => publishM.mutate(c.id)}><Eye className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(c)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </ListShell>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete calendar entry?"
        description={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }}
      />
    </div>
  );
}
