"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";

import { associationsAdminService } from "@/lib/services/associations-admin";
import type { AssociationProfile } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Switch } from "@/components/ui/switch";

export default function AssociationsListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["associations", "list", { page, search }],
    queryFn: () => associationsAdminService.list({ page, limit: 20, search: search || undefined }),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => associationsAdminService.setPublished(id, isPublished),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["associations"] }); toast.success(vars.isPublished ? "Published" : "Unpublished"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const columns: ColumnDef<AssociationProfile>[] = [
    { header: "Name", accessorKey: "name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { header: "State", accessorKey: "state", cell: ({ row }) => <span className="text-muted-foreground">{row.original.state}</span> },
    { header: "Contact", cell: ({ row }) => <span className="text-muted-foreground">{row.original.contactPerson}</span> },
    { header: "Mobile", cell: ({ row }) => <span className="text-muted-foreground">{row.original.contactMobile}</span> },
    { header: "Registered", cell: ({ row }) => <span className="text-sm">{format(new Date(row.original.createdAt), "d MMM yyyy")}</span> },
    {
      header: "Visible",
      id: "visible",
      cell: ({ row }) => {
        const assoc = row.original;
        return (
          <Switch
            checked={assoc.isPublished}
            onCheckedChange={(checked) => { publishMutation.mutate({ id: assoc.id, isPublished: checked }); }}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Associations" description="Registered associations. Toggle visibility to control who appears in the public directory." />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No association registrations yet."
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: "Search by name…",
        }}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />
    </div>
  );
}
