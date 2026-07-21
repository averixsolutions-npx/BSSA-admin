"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";
import { MoreHorizontal, Ban, ShieldAlert, RotateCcw } from "lucide-react";

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
import { ModerationDialog } from "@/components/moderation-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function AssociationsListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<QueueBucket>("PENDING");

  // Which association is being moderated, and to what target status.
  const [moderating, setModerating] = useState<{ assoc: AssociationProfile; action: "SUSPENDED" | "BLACKLISTED" } | null>(null);
  const [reactivating, setReactivating] = useState<AssociationProfile | null>(null);

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

  useEffect(() => setPage(1), [bucket]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["associations", "list", listParams],
    queryFn: () => associationsAdminService.list(listParams),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => associationsAdminService.setPublished(id, isPublished),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["associations"] }); toast.success(vars.isPublished ? "Published" : "Unpublished"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED"; reason?: string }) =>
      associationsAdminService.setStatus(id, status, reason),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      toast.success(v.status === "ACTIVE" ? "Reactivated" : v.status === "SUSPENDED" ? "Suspended" : "Blacklisted");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const columns: ColumnDef<AssociationProfile>[] = [
    {
      header: "BSSA ID",
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
                {status === "ACTIVE" ? (
                  <>
                    <DropdownMenuItem onClick={() => setModerating({ assoc: a, action: "SUSPENDED" })}>
                      <Ban className="mr-2 h-4 w-4" />Suspend
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setModerating({ assoc: a, action: "BLACKLISTED" })}>
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
                        <DropdownMenuItem className="text-destructive" onClick={() => setModerating({ assoc: a, action: "BLACKLISTED" })}>
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
      <PageHeader title="Associations" description="Registered associations. Review submissions and manage visibility." />
      <StatusFilterChips value={bucket} onChange={setBucket} counts={counts.data} />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        emptyMessage={bucket === "PENDING" ? "Nothing to review. New submissions will appear here." : "No associations in this bucket."}
        onRowClick={(a) => router.push(`/associations/${a.id}`)}
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1); },
          placeholder: "Search by name…",
        }}
        pagination={data ? { page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, onPageChange: setPage } : undefined}
      />

      <ModerationDialog
        open={!!moderating}
        onOpenChange={(o) => !o && setModerating(null)}
        action={moderating?.action ?? null}
        subjectName={moderating?.assoc.name ?? "this association"}
        onConfirm={async (reason) => {
          if (moderating) await statusMutation.mutateAsync({ id: moderating.assoc.id, status: moderating.action, reason });
        }}
      />
      <ConfirmDialog
        open={!!reactivating}
        onOpenChange={(o) => !o && setReactivating(null)}
        title="Reactivate association?"
        description={reactivating ? `${reactivating.name ?? "This association"} will be able to log in again and reappear in the public directory.` : ""}
        confirmLabel="Reactivate"
        onConfirm={async () => { if (reactivating) await statusMutation.mutateAsync({ id: reactivating.id, status: "ACTIVE" }); }}
      />
    </div>
  );
}
