"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, SearchX, UserCog } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { athletesAdminService } from "@/lib/services/athletes-admin";
import type { AthleteProfile } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Switch } from "@/components/ui/switch";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { StatusFilterChips, QUEUE_BUCKETS, type QueueBucket } from "@/components/status-filter-chips";
import { useQueueCounts } from "@/components/hooks/use-queue-counts";

export default function AthletesListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

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

  const counts = useQueueCounts("athletes");
  const bucketConfig = QUEUE_BUCKETS.find((b) => b.key === bucket)!;
  const listParams = {
    page,
    limit: 20,
    search: debounced || undefined,
    ...(bucketConfig.statuses && bucketConfig.statuses.length === 1
      ? { submissionStatus: bucketConfig.statuses[0] }
      : bucketConfig.statuses
      ? { submissionStatusIn: bucketConfig.statuses }
      : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["athletes", "list", listParams],
    queryFn: () => athletesAdminService.list(listParams),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => athletesAdminService.setPublished(id, isPublished),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["athletes"] }); toast.success(vars.isPublished ? "Published" : "Unpublished"); },
    onError: (e) => toast.error("Couldn't change visibility", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const columns: ColumnDef<AthleteProfile>[] = [
    {
      header: "Member ID",
      id: "bssaId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.bssaId ?? "—"}</span>
      ),
    },
    {
      header: "",
      id: "photo",
      cell: ({ row }) => {
        const url = row.original.photoUrl;
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
      accessorKey: "fullName",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.fullName ?? <span className="italic text-muted-foreground">Unnamed draft</span>}
        </span>
      ),
    },
    {
      header: "Discipline",
      id: "disciplines",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.disciplines?.length ? row.original.disciplines.join(", ") : "—"}
        </span>
      ),
    },
    { header: "State", accessorKey: "state", cell: ({ row }) => <span className="text-muted-foreground">{row.original.state ?? "—"}</span> },
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
    {
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[220px] block">
          {row.original.account?.email ?? "—"}
        </span>
      ),
    },
    {
      header: "Visible",
      id: "visible",
      cell: ({ row }) => {
        const athlete = row.original;
        const canToggle = athlete.submissionStatus === "APPROVED" || athlete.submissionStatus === "RESUBMITTED";
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={athlete.isPublished}
              disabled={!canToggle}
              onCheckedChange={(checked) => { publishMutation.mutate({ id: athlete.id, isPublished: checked }); }}
            />
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Athletes" description="Registered athletes. Review submissions and manage visibility." />
      <StatusFilterChips value={bucket} onChange={setBucket} counts={counts.data} />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        empty={
          debounced
            ? {
                icon: SearchX,
                title: "No athletes match that search",
                description: "Try a Member ID, FIS ID, or part of the name.",
              }
            : bucket === "PENDING"
            ? {
                icon: CheckCircle2,
                title: "Nothing to review",
                description: "New submissions land here as soon as athletes send them in.",
              }
            : {
                icon: UserCog,
                title: "No athletes in this bucket",
                description: "Switch to All to see every registered athlete.",
              }
        }
        onRowClick={(a) => router.push(`/athletes/${a.id}`)}
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setDebounced(v); setPage(1); },
          placeholder: "Search name, Member ID, or FIS ID…",
        }}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />
    </div>
  );
}
