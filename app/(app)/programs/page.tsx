"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { programsService } from "@/lib/services/programs";
import type { Program } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListShell } from "@/components/list-shell";
import { ReorderableList } from "@/components/reorderable-list";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function ProgramsListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Program | null>(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["programs", "list"],
    queryFn: () => programsService.list(),
  });

  const reorderM = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => programsService.reorder(order),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); },
    onError: (e) => toast.error("Couldn't save the new order", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const publishM = useMutation({
    mutationFn: (id: string) => programsService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast.success("Program published"); },
    onError: (e) => toast.error("Couldn't publish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const unpublishM = useMutation({
    mutationFn: (id: string) => programsService.unpublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast.success("Program unpublished"); },
    onError: (e) => toast.error("Couldn't unpublish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => programsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast.success("Program deleted"); setPendingDelete(null); },
    onError: (e) => toast.error("Couldn't delete the program", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Programs" description="Development programs. Drag to reorder." action={<Button onClick={() => router.push("/programs/new")}><Plus className="h-4 w-4" />New program</Button>} />

      <ListShell
        isLoading={isLoading}
        isError={isError}
        errorTitle="Couldn't load programs"
        isEmpty={items.length === 0}
        empty={{
          icon: BookOpen,
          title: "No programs yet",
          description: "Development programs each get their own public page.",
          action: (
            <Button size="sm" onClick={() => router.push("/programs/new")}>
              <Plus className="h-4 w-4" />Add the first program
            </Button>
          ),
        }}
      >
        <ReorderableList
          items={items}
          onReorder={(order) => reorderM.mutate(order)}
          renderItem={(p) => {
            const pub = p.status === "PUBLISHED";
            return (
              <div className="flex items-center gap-3">
                {p.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.bannerUrl} alt="" className="h-12 w-20 rounded object-cover" />
                ) : (
                  <div className="h-12 w-20 rounded bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">/{p.slug}</p>
                </div>
                <StatusBadge status={p.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/programs/${p.id}`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                    {pub ? <DropdownMenuItem onClick={() => unpublishM.mutate(p.id)}><EyeOff className="mr-2 h-4 w-4" />Unpublish</DropdownMenuItem>
                         : <DropdownMenuItem onClick={() => publishM.mutate(p.id)}><Eye className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(p)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          }}
        />
      </ListShell>

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete program?" description={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}
