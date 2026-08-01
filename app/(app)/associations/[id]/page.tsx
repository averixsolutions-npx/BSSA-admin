"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Building2, Eye, Info, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { associationsAdminService } from "@/lib/services/associations-admin";
import { associationDocumentsService } from "@/lib/services/association-documents";
import { memberMediaService } from "@/lib/services/member-media";
import { ApiCallError } from "@/lib/api-client";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { ApproveRejectBar } from "@/components/approve-reject-bar";
import { CopyChip } from "@/components/copy-chip";
import { LoadError } from "@/components/load-error";
import { PendingChangesBanner } from "@/components/pending-changes-banner";
import { ProfileHeaderCard } from "@/components/profile-header-card";
import { RejectionReasonBanner } from "@/components/rejection-reason-banner";
import { SectionCard } from "@/components/section-card";
import { AssociationDocumentsGrid } from "@/components/association-documents-grid";
import { ProfileActionsBar } from "@/components/profile-actions-bar";
import { ModerationDialog } from "@/components/moderation-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { MemberMediaGallery } from "@/components/member-media-gallery";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AssociationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  // Go back to the list the way we came, preserving its ?bucket= filter.
  const goBackToList = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/associations");
    }
  };

  const [moderating, setModerating] = useState<"SUSPENDED" | "BLACKLISTED" | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const { data: media = [] } = useQuery({
    queryKey: ["association-media", id],
    queryFn: () => memberMediaService.listForAssociation(id),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: (isPublished: boolean) => associationsAdminService.setPublished(id, isPublished),
    onSuccess: (_, isPublished) => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      toast.success(isPublished ? "Now visible in the public directory" : "Hidden from the public directory");
    },
    onError: (e) => toast.error("Couldn't change visibility", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED"; reason?: string }) =>
      associationsAdminService.setStatus(id, status, reason),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      toast.success(v.status === "ACTIVE" ? "Account reactivated" : v.status === "SUSPENDED" ? "Account suspended" : "Account blacklisted");
    },
    onError: (e) => toast.error("Couldn't change the account status", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => associationsAdminService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "associations"] });
      toast.success("Association deleted");
      router.push("/associations");
    },
    onError: (e) => toast.error("Couldn't delete the association", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const approveProfileMutation = useMutation({
    mutationFn: () => associationsAdminService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["associations", "detail", id] });
      qc.invalidateQueries({ queryKey: ["associations", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "associations"] });
      toast.success("Association approved");
    },
    onError: (e) => toast.error("Couldn't approve the association", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const rejectProfileMutation = useMutation({
    mutationFn: (reviewNote: string) => associationsAdminService.reject(id, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["associations", "detail", id] });
      qc.invalidateQueries({ queryKey: ["associations", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "associations"] });
      toast.success("Association rejected — user has been notified");
    },
    onError: (e) => toast.error("Couldn't reject the association", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!assoc) {
    return (
      <LoadError
        title="Couldn't load this association"
        backLabel="Back to associations"
        onBack={() => router.push("/associations")}
      />
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

  const hasAbout = Boolean(assoc.bio || assoc.instagramUrl || assoc.youtubeUrl || assoc.facebookUrl);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={goBackToList} className="-ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to associations
      </Button>

      <ProfileHeaderCard
        name={assoc.name ?? "Unnamed draft"}
        photoUrl={assoc.logoUrl}
        photoShape="square"
        onPhotoClick={() => setLightboxIndex(0)}
        badges={
          <>
            <AccountStatusBadge status={assoc.account?.status} />
            <SubmissionStatusBadge status={assoc.submissionStatus} />
            <Badge variant={assoc.isPublished ? "success" : "secondary"}>
              {assoc.isPublished ? "Published" : "Not published"}
            </Badge>
          </>
        }
        meta={
          <>
            {assoc.state ?? "No state"} · Registered {format(new Date(assoc.createdAt), "d MMM yyyy")}
          </>
        }
        chips={
          <>
            {assoc.bssaId && <CopyChip value={assoc.bssaId} label="Member ID" />}
            {assoc.account?.email && <CopyChip value={assoc.account.email} label="Email" />}
            {assoc.account?.mobile && <CopyChip value={assoc.account.mobile} label="Mobile number" />}
          </>
        }
      />

      <ApproveRejectBar
        status={assoc.submissionStatus}
        canApprove={canApprove}
        blockedReason={blockedReason}
        subjectLabel={assoc.name ?? "this association"}
        onApprove={() => approveProfileMutation.mutateAsync()}
        onReject={(note) => rejectProfileMutation.mutateAsync(note)}
        isPending={approveProfileMutation.isPending || rejectProfileMutation.isPending}
      />

      {softWarn && (
        <Alert variant="warning">
          <Info />
          <div className="space-y-1">
            <AlertTitle>Nothing uploaded to check</AlertTitle>
            <AlertDescription>{softWarn}</AlertDescription>
          </div>
        </Alert>
      )}

      {assoc.submissionStatus === "RESUBMITTED" && (
        <PendingChangesBanner rows={diffRows} snapshotAt={assoc.approvedSnapshot?.snapshotAt ?? null} />
      )}

      {assoc.submissionStatus === "REJECTED" && assoc.reviewNote && (
        <RejectionReasonBanner reviewNote={assoc.reviewNote} reviewedAt={assoc.reviewedAt} />
      )}

      {/* Suspension reason */}
      {status !== "ACTIVE" && assoc.account?.statusReason && (
        <Alert variant="destructive">
          <ShieldAlert />
          <div className="space-y-1">
            <AlertTitle>{status === "BLACKLISTED" ? "Blacklisted" : "Suspended"}</AlertTitle>
            <AlertDescription>{assoc.account.statusReason}</AlertDescription>
          </div>
        </Alert>
      )}

      <SectionCard
        title="Association details"
        description="Submitted by the association — read-only here."
        icon={Building2}
        tone="blue"
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {details.map((d) => (
            <div key={d.label}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</p>
              <p className="mt-0.5 text-sm">{d.value || <span className="text-muted-foreground">—</span>}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <AssociationDocumentsGrid associationId={id} />

      <MemberMediaGallery items={media} />

      {hasAbout && (
        <SectionCard
          title="About"
          description="Written by the association for their public profile."
          icon={Building2}
          tone="slate"
          collapsible
          defaultOpen={false}
        >
          {assoc.bio && <p className="whitespace-pre-line text-sm text-muted-foreground">{assoc.bio}</p>}
          <div className="flex flex-wrap gap-3 text-xs">
            {assoc.instagramUrl && <a href={assoc.instagramUrl} target="_blank" rel="noreferrer" className="underline">Instagram</a>}
            {assoc.youtubeUrl && <a href={assoc.youtubeUrl} target="_blank" rel="noreferrer" className="underline">YouTube</a>}
            {assoc.facebookUrl && <a href={assoc.facebookUrl} target="_blank" rel="noreferrer" className="underline">Facebook</a>}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Public visibility"
        description={
          assoc.isPublished
            ? "Visible in the public directory. Toggle off to hide an approved profile without changing its review status."
            : "Hidden from the public directory. Toggle on once the profile is ready to show."
        }
        icon={Eye}
        tone="amber"
        action={
          <Button
            variant={assoc.isPublished ? "outline" : "default"}
            size="sm"
            onClick={() => publishMutation.mutate(!assoc.isPublished)}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {assoc.isPublished ? "Unpublish" : "Publish"}
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Publishing only controls the public directory listing — it never changes the review verdict.
        </p>
      </SectionCard>

      <SectionCard
        title="Account actions"
        description="Suspending or blacklisting stops the association logging in. Deleting removes everything, permanently."
        icon={ShieldAlert}
        tone="rose"
        collapsible
        defaultOpen={status !== "ACTIVE"}
      >
        <ProfileActionsBar
          status={status}
          onSuspend={() => setModerating("SUSPENDED")}
          onBlacklist={() => setModerating("BLACKLISTED")}
          onReactivate={() => setReactivating(true)}
          onDelete={() => setDeleting(true)}
          isPending={statusMutation.isPending || deleteMutation.isPending}
        />
      </SectionCard>

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
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${assoc.name ?? "this association"}?`}
        description="This permanently deletes the account, profile, documents, and all uploaded files from storage. This cannot be undone."
        confirmLabel="Delete permanently"
        destructive
        onConfirm={async () => { await deleteMutation.mutateAsync(); }}
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
