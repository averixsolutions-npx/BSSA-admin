"use client";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { newsletterService } from "@/lib/services/newsletter";
import type { NewsletterSignup } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";

export default function NewsletterListPage() {
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["newsletter", "list"],
    queryFn: () => newsletterService.list(),
  });

  const handleExport = async () => {
    try {
      const csv = await newsletterService.exportCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Could not export");
    }
  };

  const columns: ColumnDef<NewsletterSignup>[] = [
    { header: "Email", accessorKey: "email", cell: ({ row }) => <span className="font-medium">{row.original.email}</span> },
    { header: "Subscribed", cell: ({ row }) => <span className="text-sm text-muted-foreground">{format(new Date(row.original.createdAt), "d MMM yyyy")}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletter"
        description="Email signups from the public site."
        action={<Button onClick={handleExport}><Download className="h-4 w-4" />Download CSV</Button>}
      />
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No newsletter signups yet."
      />
    </div>
  );
}
