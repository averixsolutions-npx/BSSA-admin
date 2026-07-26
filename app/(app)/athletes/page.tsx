"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";
import { MoreHorizontal, Ban, ShieldAlert, RotateCcw, FileText } from "lucide-react";

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
import { ModerationDialog } from "@/components/moderation-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function AthletesListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [bucket, setBucket] = useState<QueueBucket>("PENDING");

  // Which athlete is being moderated, and to what target status.
  const [moderating, setModerating] = useState<{ athlete: AthleteProfile; action: "SUSPENDED" | "BLACKLISTED" } | null>(null);
  const [reactivating, setReactivating] = useState<AthleteProfile | null>(null);

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

  // Reset page whenever the bucket changes.
  useEffect(() => setPage(1), [bucket]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["athletes", "list", listParams],
    queryFn: () => athletesAdminService.list(listParams),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => athletesAdminService.setPublished(id, isPublished),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["athletes"] }); toast.success(vars.isPublished ? "Published" : "Unpublished"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED"; reason?: string }) =>
      athletesAdminService.setStatus(id, status, reason),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["athletes"] });
      toast.success(v.status === "ACTIVE" ? "Reactivated" : v.status === "SUSPENDED" ? "Suspended" : "Blacklisted");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const columns: ColumnDef<AthleteProfile>[] = [
    {
      header: "BSSA ID",
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
    { header: "Discipline", accessorKey: "discipline", cell: ({ row }) => <span className="text-muted-foreground">{row.original.discipline ?? "—"}</span> },
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
    {
      header: "",
      id: "actions",
      cell: ({ row }) => {
        const a = row.original;
        const status = a.account?.status ?? "ACTIVE";
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/athletes/${a.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {status === "ACTIVE" ? (
                  <>
                    <DropdownMenuItem onClick={() => setModerating({ athlete: a, action: "SUSPENDED" })}>
                      <Ban className="mr-2 h-4 w-4" />Suspend
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setModerating({ athlete: a, action: "BLACKLISTED" })}>
                      <ShieldAlert className="mr-2 h-4 w-4" />Blacklist
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => setReactivating(a)}>
                      <RotateCcw className="mr-2 h-4 w-4" />Reactivate
                    </DropdownMenuItem>
                    {status === "SUSPENDED" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setModerating({ athlete: a, action: "BLACKLISTED" })}>
                          <ShieldAlert className="mr-2 h-4 w-4" />Blacklist
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
        emptyMessage={bucket === "PENDING" ? "Nothing to review. New submissions will appear here." : "No athletes in this bucket."}
        onRowClick={(a) => router.push(`/athletes/${a.id}`)}
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setDebounced(v); setPage(1); },
          placeholder: "Search by name…",
        }}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />

      <ModerationDialog
        open={!!moderating}
        onOpenChange={(o) => !o && setModerating(null)}
        action={moderating?.action ?? null}
        subjectName={moderating?.athlete.fullName ?? "this athlete"}
        onConfirm={async (reason) => {
          if (moderating) await statusMutation.mutateAsync({ id: moderating.athlete.id, status: moderating.action, reason });
        }}
      />
      <ConfirmDialog
        open={!!reactivating}
        onOpenChange={(o) => !o && setReactivating(null)}
        title="Reactivate athlete?"
        description={reactivating ? `${reactivating.fullName ?? "This athlete"} will be able to log in again and reappear on the public roster.` : ""}
        confirmLabel="Reactivate"
        onConfirm={async () => { if (reactivating) await statusMutation.mutateAsync({ id: reactivating.id, status: "ACTIVE" }); }}
      />
    </div>
  );
}
