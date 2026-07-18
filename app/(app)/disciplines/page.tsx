"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { disciplinesService } from "@/lib/services/disciplines";
import type { Discipline } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReorderableList } from "@/components/reorderable-list";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function DisciplinesListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Discipline | null>(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["disciplines", "list"],
    queryFn: () => disciplinesService.list(),
  });

  const reorderM = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => disciplinesService.reorder(order),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["disciplines"] }); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not reorder"),
  });
  const publishM = useMutation({ mutationFn: (id: string) => disciplinesService.publish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["disciplines"] }); toast.success("Published"); } });
  const unpublishM = useMutation({ mutationFn: (id: string) => disciplinesService.unpublish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["disciplines"] }); toast.success("Unpublished"); } });
  const deleteM = useMutation({
    mutationFn: (id: string) => disciplinesService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["disciplines"] }); toast.success("Deleted"); setPendingDelete(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Disciplines" description="Team / discipline pages. Drag to reorder." action={<Button onClick={() => router.push("/disciplines/new")}><Plus className="h-4 w-4" />New discipline</Button>} />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : isError ? (
        <p className="text-destructive">Couldn't load disciplines.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No disciplines yet. Click 'New discipline' to add one.</p>
      ) : (
        <ReorderableList
          items={items}
          onReorder={(order) => reorderM.mutate(order)}
          renderItem={(d) => {
            const pub = d.status === "PUBLISHED";
            return (
              <div className="flex items-center gap-3">
                {d.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.bannerUrl} alt="" className="h-12 w-20 rounded object-cover" />
                ) : (
                  <div className="h-12 w-20 rounded bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">/{d.slug}</p>
                </div>
                <StatusBadge status={d.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/disciplines/${d.id}`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                    {pub ? <DropdownMenuItem onClick={() => unpublishM.mutate(d.id)}><EyeOff className="mr-2 h-4 w-4" />Unpublish</DropdownMenuItem>
                         : <DropdownMenuItem onClick={() => publishM.mutate(d.id)}><Eye className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(d)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          }}
        />
      )}

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete discipline?" description={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}
