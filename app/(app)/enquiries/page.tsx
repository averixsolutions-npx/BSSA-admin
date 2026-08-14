"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Inbox, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { enquiriesService } from "@/lib/services/enquiries";
import { ApiCallError } from "@/lib/api-client";
import type { Enquiry } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EnquiryDetailDialog } from "@/components/enquiry-detail-dialog";

export default function EnquiriesListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Enquiry | null>(null);

  // Debounce the search box and reset to page 1 when the query changes.
  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["enquiries", "list", { page, q }],
    queryFn: () => enquiriesService.list({ page, limit: 20, q }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => enquiriesService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enquiries"] });
      toast.success("Enquiry deleted");
      setPendingDelete(null);
      setSelected(null);
    },
    onError: (e) =>
      toast.error("Couldn't delete the enquiry", {
        description: e instanceof ApiCallError ? e.message : undefined,
      }),
  });

  const columns: ColumnDef<Enquiry>[] = [
    { header: "Name", accessorKey: "name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { header: "Email", accessorKey: "email", cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
    { header: "Phone", cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone ?? "—"}</span> },
    { header: "Message", cell: ({ row }) => <span className="text-sm text-muted-foreground line-clamp-2 max-w-md">{row.original.message}</span> },
    { header: "Received", cell: ({ row }) => <span className="text-sm">{format(new Date(row.original.createdAt), "d MMM yyyy")}</span> },
    {
      header: "",
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Delete enquiry"
          onClick={(e) => { e.stopPropagation(); setPendingDelete(row.original); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Enquiries" description="Contact and floating-enquiry submissions from the public site." />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: "Search name, email, phone, or message…",
        }}
        onRowClick={(row) => setSelected(row)}
        empty={{
          icon: Inbox,
          title: q ? "No matching enquiries" : "No enquiries yet",
          description: q ? "Try a different search term." : "Messages from the public contact form land here.",
        }}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />

      <EnquiryDetailDialog
        enquiry={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onDelete={(enq) => setPendingDelete(enq)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete enquiry?"
        description={pendingDelete ? `The enquiry from "${pendingDelete.name}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (pendingDelete) await deleteM.mutateAsync(pendingDelete.id); }}
      />
    </div>
  );
}
