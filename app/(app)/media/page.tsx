"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";

import { mediaService } from "@/lib/services/media";
import type { MediaItem, MediaPlatform } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const PLATFORMS: MediaPlatform[] = ["YOUTUBE", "INSTAGRAM", "TWITTER", "FACEBOOK", "VIMEO"];

export default function MediaListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState<MediaPlatform | "">("");
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["media", "list", { page, platform }],
    queryFn: () => mediaService.list({ page, limit: 20, platform: platform || undefined }),
  });

  const publishM = useMutation({ mutationFn: (id: string) => mediaService.publish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Published"); } });
  const unpublishM = useMutation({ mutationFn: (id: string) => mediaService.unpublish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Unpublished"); } });
  const deleteM = useMutation({
    mutationFn: (id: string) => mediaService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Deleted"); setPendingDelete(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const columns: ColumnDef<MediaItem>[] = [
    { header: "Title", accessorKey: "title", cell: ({ row }) => (
      <button onClick={() => router.push(`/media/${row.original.id}`)} className="font-medium text-left hover:underline">{row.original.title}</button>
    )},
    { header: "Platform", accessorKey: "platform", cell: ({ row }) => <Badge variant="outline">{row.original.platform.charAt(0) + row.original.platform.slice(1).toLowerCase()}</Badge> },
    { header: "Duration", cell: ({ row }) => <span className="text-muted-foreground">{row.original.duration ?? "—"}</span> },
    { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: "", id: "actions", cell: ({ row }) => {
      const m = row.original;
      const pub = m.status === "PUBLISHED";
      return (
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/media/${m.id}`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            {pub ? <DropdownMenuItem onClick={() => unpublishM.mutate(m.id)}><EyeOff className="mr-2 h-4 w-4" />Unpublish</DropdownMenuItem>
                 : <DropdownMenuItem onClick={() => publishM.mutate(m.id)}><Eye className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(m)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Media" description="Video highlights embedded from social channels." action={<Button onClick={() => router.push("/media/new")}><Plus className="h-4 w-4" />New media</Button>} />
      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} isError={isError}
        emptyMessage="No media items yet."
        toolbar={
          <Select value={platform || "all"} onValueChange={(v) => { setPlatform(v === "all" ? "" : v as MediaPlatform); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        }
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />
      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete media item?" description={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}
