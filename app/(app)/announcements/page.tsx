"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { announcementsService } from "@/lib/services/announcements";
import type { Announcement } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListShell } from "@/components/list-shell";
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
    onError: (e) => toast.error("Couldn't save the new order", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const toggleM = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => announcementsService.update(id, { isActive }),
    onSuccess: (_, v) => { invalidate(); toast.success(v.isActive ? "Announcement shown" : "Announcement hidden"); },
    onError: (e) => toast.error("Couldn't change visibility", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => announcementsService.remove(id),
    onSuccess: () => { invalidate(); toast.success("Announcement deleted"); setPendingDelete(null); },
    onError: (e) => toast.error("Couldn't delete the announcement", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="The scrolling ticker on the public site. Drag to reorder; toggle to show/hide."
        action={<Button onClick={() => router.push("/announcements/new")}><Plus className="h-4 w-4" />New announcement</Button>}
      />

      <ListShell
        isLoading={isLoading}
        isError={isError}
        errorTitle="Couldn't load announcements"
        isEmpty={items.length === 0}
        empty={{
          icon: Megaphone,
          title: "No announcements yet",
          description: "Announcements scroll across the top of the public site.",
          action: (
            <Button size="sm" onClick={() => router.push("/announcements/new")}>
              <Plus className="h-4 w-4" />Add the first announcement
            </Button>
          ),
        }}
      >
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
      </ListShell>

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
