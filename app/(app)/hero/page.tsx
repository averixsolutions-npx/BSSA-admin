"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { heroService } from "@/lib/services/hero";
import type { HeroSlide } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListShell } from "@/components/list-shell";
import { ReorderableList } from "@/components/reorderable-list";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function HeroListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<HeroSlide | null>(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["hero", "list"],
    queryFn: () => heroService.list(),
  });

  const reorderM = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => heroService.reorder(order),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); },
    onError: (e) => toast.error("Couldn't save the new order", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const publishM = useMutation({
    mutationFn: (id: string) => heroService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); toast.success("Slide published"); },
    onError: (e) => toast.error("Couldn't publish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const unpublishM = useMutation({
    mutationFn: (id: string) => heroService.unpublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); toast.success("Slide unpublished"); },
    onError: (e) => toast.error("Couldn't unpublish", { description: e instanceof ApiCallError ? e.message : undefined }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => heroService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero"] }); toast.success("Slide deleted"); setPendingDelete(null); },
    onError: (e) => toast.error("Couldn't delete the slide", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Hero slides" description="Homepage carousel. Drag to reorder." action={<Button onClick={() => router.push("/hero/new")}><Plus className="h-4 w-4" />New slide</Button>} />

      <ListShell
        isLoading={isLoading}
        isError={isError}
        errorTitle="Couldn't load hero slides"
        isEmpty={items.length === 0}
        empty={{
          icon: ImageIcon,
          title: "No hero slides yet",
          description: "Slides make up the homepage carousel — the first thing visitors see.",
          action: (
            <Button size="sm" onClick={() => router.push("/hero/new")}>
              <Plus className="h-4 w-4" />Add the first slide
            </Button>
          ),
        }}
      >
        <ReorderableList
          items={items}
          onReorder={(order) => reorderM.mutate(order)}
          renderItem={(s) => {
            const pub = s.status === "PUBLISHED";
            return (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt="" className="h-14 w-24 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.headline}</p>
                  {s.tag && <p className="text-xs text-muted-foreground">{s.tag}</p>}
                </div>
                <StatusBadge status={s.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/hero/${s.id}`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                    {pub ? <DropdownMenuItem onClick={() => unpublishM.mutate(s.id)}><EyeOff className="mr-2 h-4 w-4" />Unpublish</DropdownMenuItem>
                         : <DropdownMenuItem onClick={() => publishM.mutate(s.id)}><Eye className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(s)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          }}
        />
      </ListShell>

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete hero slide?" description={pendingDelete ? `"${pendingDelete.headline}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}
