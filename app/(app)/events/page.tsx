"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { eventsService } from "@/lib/services/events";
import type { Event, ContentStatus } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function EventsListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ContentStatus | "">("");
  const [state, setState] = useState<"ongoing" | "upcoming" | "past" | "">("");
  const [pendingDelete, setPendingDelete] = useState<Event | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["events", "list", { page, status, state }],
    queryFn: () => eventsService.list({ page, limit: 20, status, state }),
  });

  const publishM = useMutation({ mutationFn: eventsService.publish, onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Published"); } });
  const unpublishM = useMutation({ mutationFn: eventsService.unpublish, onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Unpublished"); } });
  const deleteM = useMutation({
    mutationFn: eventsService.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Deleted"); setPendingDelete(null); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const columns: ColumnDef<Event>[] = [
    { header: "Title", accessorKey: "title", cell: ({ row }) => (
      <button onClick={() => router.push(`/events/${row.original.id}`)} className="font-medium text-left hover:underline">{row.original.title}</button>
    )},
    { header: "Venue", accessorKey: "venue", cell: ({ row }) => <span className="text-muted-foreground">{row.original.venue}</span> },
    { header: "Dates", cell: ({ row }) => (
      <span className="text-sm">{format(new Date(row.original.startDate), "d MMM")} – {format(new Date(row.original.endDate), "d MMM yyyy")}</span>
    )},
    { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: "", id: "actions", cell: ({ row }) => {
      const ev = row.original;
      const pub = ev.status === "PUBLISHED";
      return (
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/events/${ev.id}`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            {pub ? <DropdownMenuItem onClick={() => unpublishM.mutate(ev.id)}><EyeOff className="mr-2 h-4 w-4" />Unpublish</DropdownMenuItem>
                 : <DropdownMenuItem onClick={() => publishM.mutate(ev.id)}><Eye className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setPendingDelete(ev)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Competitions and calendar entries." action={<Button onClick={() => router.push("/events/new")}><Plus className="h-4 w-4" />New event</Button>} />
      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} isError={isError}
        emptyMessage="No events yet."
        toolbar={<>
          <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v as ContentStatus); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PUBLISHED">Published</SelectItem></SelectContent>
          </Select>
          <Select value={state || "all"} onValueChange={(v) => { setState(v === "all" ? "" : v as "ongoing"|"upcoming"|"past"); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="ongoing">Ongoing</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="past">Past</SelectItem></SelectContent>
          </Select>
        </>}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />
      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Delete event?" description={pendingDelete ? `"${pendingDelete.title}" and all its results will be permanently deleted.` : ""} confirmLabel="Delete" destructive onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }} />
    </div>
  );
}
