"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Mail } from "lucide-react";
import { format } from "date-fns";

import { enquiriesService } from "@/lib/services/enquiries";
import type { Enquiry } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";

export default function EnquiriesListPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["enquiries", "list", { page }],
    queryFn: () => enquiriesService.list({ page, limit: 20 }),
  });

  const columns: ColumnDef<Enquiry>[] = [
    { header: "Name", accessorKey: "name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { header: "Email", accessorKey: "email", cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
    { header: "Phone", cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone ?? "—"}</span> },
    { header: "Message", cell: ({ row }) => <span className="text-sm text-muted-foreground line-clamp-2 max-w-md">{row.original.message}</span> },
    { header: "Source", cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.sourcePage ?? "—"}</span> },
    { header: "Received", cell: ({ row }) => <span className="text-sm">{format(new Date(row.original.createdAt), "d MMM yyyy")}</span> },
    {
      header: "",
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <a href={`mailto:${row.original.email}`}><Mail className="h-4 w-4" /></a>
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
        emptyMessage="No enquiries yet."
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />
    </div>
  );
}
