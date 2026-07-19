"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { announcementsService } from "@/lib/services/announcements";
import type { Announcement } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReorderableList } from "@/components/reorderable-list";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function AnnouncementsListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["announcements", "list"],
    queryFn: () => announcementsService.list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  const reorderM = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => announcementsService.reorder(order),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not reorder"),
  });
  const toggleM = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => announcementsService.update(id, { isActive }),
    onSuccess: (_, v) => { invalidate(); toast.success(v.isActive ? "Activated" : "Deactivated"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => announcementsService.remove(id),
    onSuccess: () => { invalidate(); toast.success("Deleted"); setPendingDelete(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="The scrolling ticker on the public site. Drag to reorder; toggle to show/hide."
        action={<Button onClick={() => router.push("/announcements/new")}><Plus className="h-4 w-4" />New announcement</Button>}
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : isError ? (
        <p className="text-destructive">Couldn't load announcements.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No announcements yet.</p>
      ) : (
        <ReorderableList
          items={items}
          onReorder={(order) => reorderM.mutate(order)}
          renderItem={(a) => (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.text}</p>
                {a.href && <p className="text-xs text-muted-foreground truncate">{a.href}</p>}
              </div>
              <Badge variant={a.isActive ? "success" : "secondary"}>{a.isActive ? "Active" : "Hidden"}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/announcements/${a.id}`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  {a.isActive
                    ? <DropdownMenuItem onClick={() => toggleM.mutate({ id: a.id, isActive: false })}><EyeOff className="mr-2 h-4 w-4" />Hide</DropdownMenuItem>
                    : <DropdownMenuItem onClick={() => toggleM.mutate({ id: a.id, isActive: true })}><Eye className="mr-2 h-4 w-4" />Show</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(a)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete announcement?"
        description={pendingDelete ? `"${pendingDelete.text}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }}
      />
    </div>
  );
}
