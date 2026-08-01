"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, CheckCircle2, SearchX } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { associationsAdminService } from "@/lib/services/associations-admin";
import type { AssociationProfile } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Switch } from "@/components/ui/switch";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { StatusFilterChips, QUEUE_BUCKETS, type QueueBucket } from "@/components/status-filter-chips";
import { useQueueCounts } from "@/components/hooks/use-queue-counts";

export default function AssociationsListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter lives in the URL (?bucket=…) so it survives Back-navigation.
  // Default is "ALL" — show everyone on first load.
  const rawBucket = searchParams.get("bucket");
  const bucket: QueueBucket = QUEUE_BUCKETS.some((b) => b.key === rawBucket)
    ? (rawBucket as QueueBucket)
    : "ALL";

  const setBucket = (next: QueueBucket) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("bucket", next);
    router.replace(`${pathname}?${sp.toString()}`); // replace: don't spam history on chip clicks
    setPage(1);
  };

  const counts = useQueueCounts("associations");
  const bucketConfig = QUEUE_BUCKETS.find((b) => b.key === bucket)!;
  const listParams = {
    page,
    limit: 20,
    search: search || undefined,
    ...(bucketConfig.statuses && bucketConfig.statuses.length === 1
      ? { submissionStatus: bucketConfig.statuses[0] }
      : bucketConfig.statuses
      ? { submissionStatusIn: bucketConfig.statuses }
      : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["associations", "list", listParams],
    queryFn: () => associationsAdminService.list(listParams),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => associationsAdminService.setPublished(id, isPublished),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["associations"] }); toast.success(vars.isPublished ? "Published" : "Unpublished"); },
    onError: (e) => toast.error("Couldn't change visibility", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const columns: ColumnDef<AssociationProfile>[] = [
    {
      header: "Member ID",
      id: "bssaId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.bssaId ?? "—"}</span>
      ),
    },
    {
      header: "",
      id: "logo",
      cell: ({ row }) => {
        const url = row.original.logoUrl;
        return (
          <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name ?? <span className="italic text-muted-foreground">Unnamed draft</span>}
        </span>
      ),
    },
    { header: "State", accessorKey: "state", cell: ({ row }) => <span className="text-muted-foreground">{row.original.state ?? "—"}</span> },
    {
      header: "Contact",
      id: "contact",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="text-sm">
            <div className="text-muted-foreground">{a.contactPerson ?? "—"}</div>
            {(a.president || a.treasurer) && (
              <div className="text-xs text-muted-foreground/80">
                {a.president && <>Pres: {a.president}</>}
                {a.president && a.treasurer && " · "}
                {a.treasurer && <>Treas: {a.treasurer}</>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Status",
      id: "status",
      cell: ({ row }) => <AccountStatusBadge status={row.original.account?.status} />,
    },
    {
      header: "Review",
      id: "submissionStatus",
      cell: ({ row }) => <SubmissionStatusBadge status={row.original.submissionStatus} />,
    },
    {
      header: "Submitted",
      id: "submittedAt",
      cell: ({ row }) => {
        const t = row.original.submittedAt;
        return <span className="text-sm text-muted-foreground">{t ? format(new Date(t), "d MMM yyyy") : "—"}</span>;
      },
    },
    { header: "Mobile", cell: ({ row }) => <span className="text-muted-foreground">{row.original.contactMobile ?? "—"}</span> },
    {
      header: "Visible",
      id: "visible",
      cell: ({ row }) => {
        const assoc = row.original;
        const canToggle = assoc.submissionStatus === "APPROVED" || assoc.submissionStatus === "RESUBMITTED";
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={assoc.isPublished}
              disabled={!canToggle}
              onCheckedChange={(checked) => { publishMutation.mutate({ id: assoc.id, isPublished: checked }); }}
            />
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Associations" description="Registered associations. Review submissions and manage visibility." />
      <StatusFilterChips value={bucket} onChange={setBucket} counts={counts.data} />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        empty={
          search
            ? {
                icon: SearchX,
                title: "No associations match that search",
                description: "Try a Member ID or part of the name.",
              }
            : bucket === "PENDING"
            ? {
                icon: CheckCircle2,
                title: "Nothing to review",
                description: "New submissions land here as soon as associations send them in.",
              }
            : {
                icon: Building2,
                title: "No associations in this bucket",
                description: "Switch to All to see every registered association.",
              }
        }
        onRowClick={(a) => router.push(`/associations/${a.id}`)}
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: "Search name or Member ID…",
        }}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />
    </div>
  );
}
