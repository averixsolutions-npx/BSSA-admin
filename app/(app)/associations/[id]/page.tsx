"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Copy, Ban, ShieldAlert, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { associationsAdminService } from "@/lib/services/associations-admin";
import { associationDocumentsService } from "@/lib/services/association-documents";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { ApproveRejectBar } from "@/components/approve-reject-bar";
import { PendingChangesBanner } from "@/components/pending-changes-banner";
import { RejectionReasonBanner } from "@/components/rejection-reason-banner";
import { AssociationDocumentsGrid } from "@/components/association-documents-grid";
import { ModerationDialog } from "@/components/moderation-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AssociationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [moderating, setModerating] = useState<"SUSPENDED" | "BLACKLISTED" | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: assoc, isLoading } = useQuery({
    queryKey: ["associations", "detail", id],
    queryFn: () => associationsAdminService.getById(id),
    enabled: !!id,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["association-documents", id],
    queryFn: () => associationDocumentsService.list(id),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: (isPublished: boolean) => associationsAdminService.setPublished(id, isPublished),
    onSuccess: (_, isPublished) => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      toast.success(isPublished ? "Published" : "Unpublished");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED"; reason?: string }) =>
      associationsAdminService.setStatus(id, status, reason),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      toast.success(v.status === "ACTIVE" ? "Reactivated" : v.status === "SUSPENDED" ? "Suspended" : "Blacklisted");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const approveProfileMutation = useMutation({
    mutationFn: () => associationsAdminService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["associations", "detail", id] });
      qc.invalidateQueries({ queryKey: ["associations", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "associations"] });
      toast.success("Association approved");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const rejectProfileMutation = useMutation({
    mutationFn: (reviewNote: string) => associationsAdminService.reject(id, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["associations", "detail", id] });
      qc.invalidateQueries({ queryKey: ["associations", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "associations"] });
      toast.success("Association rejected — user has been notified");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!assoc) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Couldn&apos;t load this association.</p>
        <Button variant="outline" onClick={() => router.push("/associations")}>Back</Button>
      </div>
    );
  }

  const status = assoc.account?.status ?? "ACTIVE";

  // No hard gate for associations — all document types are optional.
  const canApprove = true;
  const blockedReason: string | undefined = undefined;
  const softWarn =
    (assoc.submissionStatus === "SUBMITTED" || assoc.submissionStatus === "RESUBMITTED") && docs.length === 0
      ? "No documents uploaded yet. Approve anyway if you're confident in the association's details."
      : undefined;

  const diffRows =
    assoc.submissionStatus === "RESUBMITTED" && assoc.approvedSnapshot
      ? [
          { label: "Name", before: assoc.approvedSnapshot.name, after: assoc.name },
          { label: "State", before: assoc.approvedSnapshot.state, after: assoc.state },
          { label: "Incorporation number", before: assoc.approvedSnapshot.incorporationNumber, after: assoc.incorporationNumber },
          { label: "President", before: assoc.approvedSnapshot.president, after: assoc.president },
          { label: "Treasurer", before: assoc.approvedSnapshot.treasurer, after: assoc.treasurer },
        ]
      : [];

  // Photos → lightbox (only those that exist)
  const images: LightboxImage[] = [
    ...(assoc.coverUrl ? [{ url: assoc.coverUrl, label: `${assoc.name ?? "Association"} — cover` }] : []),
    ...(assoc.logoUrl ? [{ url: assoc.logoUrl, label: `${assoc.name ?? "Association"} — logo` }] : []),
  ];

  const details: { label: string; value: string | null }[] = [
    { label: "President", value: assoc.president },
    { label: "Treasurer", value: assoc.treasurer },
    { label: "Contact person", value: assoc.contactPerson },
    { label: "Contact mobile", value: assoc.contactMobile },
    { label: "Email", value: assoc.email },
    { label: "Incorporation no.", value: assoc.incorporationNumber },
    { label: "State", value: assoc.state },
    { label: "Address", value: assoc.address },
  ];

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.push("/associations")} className="-ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to associations
      </Button>

      {/* Cover + logo banner (only if photos exist) */}
      {(assoc.coverUrl || assoc.logoUrl) && (
        <div className="relative overflow-hidden rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => assoc.coverUrl && setLightboxIndex(0)}
            className="block h-40 w-full bg-muted"
          >
            {assoc.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assoc.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </button>
          {assoc.logoUrl && (
            <button
              type="button"
              onClick={() => setLightboxIndex(assoc.coverUrl ? 1 : 0)}
              className="absolute bottom-3 left-4 h-16 w-16 overflow-hidden rounded-lg border-2 border-background bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assoc.logoUrl} alt="" className="h-full w-full object-cover" />
            </button>
          )}
        </div>
      )}

      <PageHeader
        title={assoc.name ?? "Unnamed draft"}
        description={
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {assoc.bssaId && (
              <button onClick={() => copy(assoc.bssaId!, "BSSA ID")}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70">
                {assoc.bssaId} <Copy className="h-3 w-3 opacity-60" />
              </button>
            )}
            <AccountStatusBadge status={assoc.account?.status} />
            <SubmissionStatusBadge status={assoc.submissionStatus} />
            <Badge variant={assoc.isPublished ? "success" : "secondary"}>
              {assoc.isPublished ? "Published" : "Not published"}
            </Badge>
            <span className="text-sm text-muted-foreground">{assoc.state ?? "—"}</span>
          </div>
        }
      />

      {/* Suspension reason banner */}
      {status !== "ACTIVE" && assoc.account?.statusReason && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm">
          <span className="font-medium text-red-600">
            {status === "BLACKLISTED" ? "Blacklisted" : "Suspended"}:
          </span>{" "}
          {assoc.account.statusReason}
        </div>
      )}

      <ApproveRejectBar
        status={assoc.submissionStatus}
        canApprove={canApprove}
        blockedReason={blockedReason}
        subjectLabel={assoc.name ?? "this association"}
        onApprove={() => approveProfileMutation.mutateAsync()}
        onReject={(note) => rejectProfileMutation.mutateAsync(note)}
        isPending={approveProfileMutation.isPending || rejectProfileMutation.isPending}
      />

      {softWarn && <p className="text-xs text-amber-700 dark:text-amber-400">{softWarn}</p>}

      {assoc.submissionStatus === "RESUBMITTED" && (
        <PendingChangesBanner rows={diffRows} snapshotAt={assoc.approvedSnapshot?.snapshotAt ?? null} />
      )}

      {assoc.submissionStatus === "REJECTED" && assoc.reviewNote && (
        <RejectionReasonBanner reviewNote={assoc.reviewNote} reviewedAt={assoc.reviewedAt} />
      )}

      {/* Details card */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Association details</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-lg border p-5 sm:grid-cols-2">
          {details.map((d) => (
            <div key={d.label}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</p>
              <p className="mt-0.5 text-sm">{d.value || <span className="text-muted-foreground">—</span>}</p>
            </div>
          ))}
        </div>
      </section>

      <AssociationDocumentsGrid associationId={id} />

      {/* Actions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-5">
          <div className="mr-auto">
            <p className="text-sm font-medium">Public visibility</p>
            <p className="text-xs text-muted-foreground">
              {assoc.isPublished ? "Visible in the public directory." : "Hidden from the public directory."}
              {" "}Toggle to temporarily hide an approved profile. Doesn't change review status.
            </p>
          </div>
          <Button
            variant={assoc.isPublished ? "outline" : "default"}
            onClick={() => publishMutation.mutate(!assoc.isPublished)}
            disabled={publishMutation.isPending}
          >
            {assoc.isPublished ? "Unpublish" : "Publish"}
          </Button>

          {status === "ACTIVE" ? (
            <>
              <Button variant="outline" onClick={() => setModerating("SUSPENDED")}>
                <Ban className="mr-2 h-4 w-4" /> Suspend
              </Button>
              <Button variant="destructive" onClick={() => setModerating("BLACKLISTED")}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Blacklist
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setReactivating(true)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reactivate
              </Button>
              {status === "SUSPENDED" && (
                <Button variant="destructive" onClick={() => setModerating("BLACKLISTED")}>
                  <ShieldAlert className="mr-2 h-4 w-4" /> Blacklist
                </Button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Registered date footer */}
      <p className="text-xs text-muted-foreground">
        Registered {format(new Date(assoc.createdAt), "d MMM yyyy")}
        {assoc.account?.mobile && <> · {assoc.account.mobile}</>}
      </p>

      <ModerationDialog
        open={!!moderating}
        onOpenChange={(o) => !o && setModerating(null)}
        action={moderating}
        subjectName={assoc.name ?? "this association"}
        onConfirm={async (reason) => {
          if (moderating) await statusMutation.mutateAsync({ status: moderating, reason });
        }}
      />
      <ConfirmDialog
        open={reactivating}
        onOpenChange={setReactivating}
        title="Reactivate association?"
        description={`${assoc.name ?? "This association"} will be able to log in again and reappear in the public directory.`}
        confirmLabel="Reactivate"
        onConfirm={async () => { await statusMutation.mutateAsync({ status: "ACTIVE" }); }}
      />

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
