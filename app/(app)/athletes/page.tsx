"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";

import { athletesAdminService } from "@/lib/services/athletes-admin";
import type { AthleteProfile } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Switch } from "@/components/ui/switch";

export default function AthletesListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["athletes", "list", { page, search: debounced }],
    queryFn: () => athletesAdminService.list({ page, limit: 20, search: debounced || undefined }),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => athletesAdminService.setPublished(id, isPublished),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["athletes"] }); toast.success(vars.isPublished ? "Published" : "Unpublished"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const columns: ColumnDef<AthleteProfile>[] = [
    { header: "Name", accessorKey: "fullName", cell: ({ row }) => <span className="font-medium">{row.original.fullName}</span> },
    { header: "Discipline", accessorKey: "discipline", cell: ({ row }) => <span className="text-muted-foreground">{row.original.discipline}</span> },
    { header: "State", accessorKey: "state", cell: ({ row }) => <span className="text-muted-foreground">{row.original.state}</span> },
    { header: "Mobile", cell: ({ row }) => <span className="text-muted-foreground">{row.original.account?.mobile ?? "—"}</span> },
    { header: "Registered", cell: ({ row }) => <span className="text-sm">{format(new Date(row.original.createdAt), "d MMM yyyy")}</span> },
    {
      header: "Visible",
      id: "visible",
      cell: ({ row }) => {
        const athlete = row.original;
        return (
          <Switch
            checked={athlete.isPublished}
            onCheckedChange={(checked) => { publishMutation.mutate({ id: athlete.id, isPublished: checked }); }}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Athletes" description="Registered athletes. Toggle visibility to control who appears on the public roster." />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No athlete registrations yet."
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setDebounced(v); setPage(1); },
          placeholder: "Search by name…",
        }}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />
    </div>
  );
}
