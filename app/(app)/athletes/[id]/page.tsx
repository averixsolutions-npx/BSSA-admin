"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, FileX, Copy } from "lucide-react";
import { toast } from "sonner";

import { athletesAdminService } from "@/lib/services/athletes-admin";
import { athleteDocumentsService } from "@/lib/services/athlete-documents";
import { athleteAchievementsService } from "@/lib/services/athlete-achievements";
import {
  ALL_DOCUMENT_TYPES,
  MANDATORY_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type AthleteAchievement,
  type VerificationStatus,
} from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { ApproveRejectBar } from "@/components/approve-reject-bar";
import { PendingChangesBanner } from "@/components/pending-changes-banner";
import { RejectionReasonBanner } from "@/components/rejection-reason-banner";
import { DocumentsReviewGrid } from "@/components/documents-review-grid";
import { DOCUMENT_REJECTION_TEMPLATES } from "@/components/rejection-templates";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { DocumentReviewDialog } from "@/components/document-review-dialog";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AthleteDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [reviewingAch, setReviewingAch] = useState<{ item: AthleteAchievement; label: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["athletes", "detail", id],
    queryFn: () => athletesAdminService.getById(id),
    enabled: !!id,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["athlete-documents", id],
    queryFn: () => athleteDocumentsService.list(id),
    enabled: !!id,
  });

  const { data: achievements = [], isLoading: achLoading } = useQuery({
    queryKey: ["athlete-achievements", id],
    queryFn: () => athleteAchievementsService.list(id),
    enabled: !!id,
  });

  const verifyDocMutation = useMutation({
    mutationFn: ({ docId, status, reviewNote }: { docId: string; status: VerificationStatus; reviewNote?: string }) =>
      athleteDocumentsService.verify(id, docId, status, reviewNote),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athlete-documents", id] }); toast.success("Document updated"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const verifyAchMutation = useMutation({
    mutationFn: ({ achId, status, reviewNote }: { achId: string; status: VerificationStatus; reviewNote?: string }) =>
      athleteAchievementsService.verify(id, achId, status, reviewNote),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athlete-achievements", id] }); toast.success("Achievement updated"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const approveProfileMutation = useMutation({
    mutationFn: () => athletesAdminService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes", "detail", id] });
      qc.invalidateQueries({ queryKey: ["athletes", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "athletes"] });
      toast.success("Profile approved");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed to approve"),
  });

  const rejectProfileMutation = useMutation({
    mutationFn: (reviewNote: string) => athletesAdminService.reject(id, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes", "detail", id] });
      qc.invalidateQueries({ queryKey: ["athletes", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "athletes"] });
      toast.success("Profile rejected — user has been notified");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed to reject"),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (profileLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Couldn't load this athlete.</p>
        <Button variant="outline" onClick={() => router.push("/athletes")}>Back</Button>
      </div>
    );
  }

  const approvedMandatoryCount = MANDATORY_DOCUMENT_TYPES.filter((t) =>
    documents.some((d) => d.type === t && d.status === "APPROVED")
  ).length;
  const canApprove = approvedMandatoryCount === MANDATORY_DOCUMENT_TYPES.length;
  const blockedReason = !canApprove
    ? `Approve all mandatory documents first (${approvedMandatoryCount}/${MANDATORY_DOCUMENT_TYPES.length})`
    : undefined;

  const diffRows =
    profile.submissionStatus === "RESUBMITTED" && profile.approvedSnapshot
      ? [
          { label: "Full name", before: profile.approvedSnapshot.fullName, after: profile.fullName },
          {
            label: "Date of birth",
            before: profile.approvedSnapshot.dob?.slice(0, 10) ?? null,
            after: profile.dob?.slice(0, 10) ?? null,
          },
          { label: "Gender", before: profile.approvedSnapshot.gender, after: profile.gender },
          { label: "Discipline", before: profile.approvedSnapshot.discipline, after: profile.discipline },
          { label: "State", before: profile.approvedSnapshot.state, after: profile.state },
          { label: "Address", before: profile.approvedSnapshot.address, after: profile.address },
        ]
      : [];

  // Uploaded docs, in display order — the lightbox navigates across these.
  const uploadedDocs = ALL_DOCUMENT_TYPES
    .map((type) => documents.find((d) => d.type === type))
    .filter((d): d is (typeof documents)[number] => !!d);

  const lightboxImages: LightboxImage[] = uploadedDocs.map((d) => ({
    url: d.viewUrl,
    label: DOCUMENT_TYPE_LABELS[d.type],
  }));

  const achievementImages: LightboxImage[] = achievements.map((a) => ({
    url: a.viewUrl,
    label: `${a.title} — proof`,
  }));
  const allImages: LightboxImage[] = [...lightboxImages, ...achievementImages];

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.push("/athletes")} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />Back to athletes
      </Button>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-muted shrink-0 border">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt={profile.fullName ?? "Athlete"} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
          )}
        </div>
        <PageHeader
          title={profile.fullName ?? "Unnamed draft"}
          description={
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {profile.bssaId && (
                <button
                  onClick={() => copy(profile.bssaId!, "BSSA ID")}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70"
                >
                  {profile.bssaId} <Copy className="h-3 w-3 opacity-60" />
                </button>
              )}
              <AccountStatusBadge status={profile.account?.status} />
              <SubmissionStatusBadge status={profile.submissionStatus} />
              <Badge variant={profile.isPublished ? "success" : "secondary"}>{profile.isPublished ? "Published" : "Not published"}</Badge>
              <span className="text-sm text-muted-foreground">
                {profile.discipline ?? "—"} · {profile.state ?? "—"}
              </span>
              {profile.account?.email && (
                <button
                  onClick={() => copy(profile.account!.email, "Email")}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70"
                >
                  {profile.account.email} <Copy className="h-3 w-3 opacity-60" />
                </button>
              )}
              {profile.account?.mobile && (
                <button
                  onClick={() => copy(profile.account!.mobile!, "Mobile number")}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70"
                  title="Contact mobile (optional profile field)"
                >
                  {profile.account.mobile} <Copy className="h-3 w-3 opacity-60" />
                </button>
              )}
            </div>
          }
        />
      </div>

      <ApproveRejectBar
        status={profile.submissionStatus}
        canApprove={canApprove}
        blockedReason={blockedReason}
        subjectLabel={profile.fullName ?? "this athlete"}
        onApprove={() => approveProfileMutation.mutateAsync()}
        onReject={(note) => rejectProfileMutation.mutateAsync(note)}
        isPending={approveProfileMutation.isPending || rejectProfileMutation.isPending}
      />

      {profile.submissionStatus === "RESUBMITTED" && (
        <PendingChangesBanner rows={diffRows} snapshotAt={profile.approvedSnapshot?.snapshotAt ?? null} />
      )}

      {profile.submissionStatus === "REJECTED" && profile.reviewNote && (
        <RejectionReasonBanner reviewNote={profile.reviewNote} reviewedAt={profile.reviewedAt} />
      )}

      <DocumentsReviewGrid
        allTypes={ALL_DOCUMENT_TYPES}
        mandatoryTypes={MANDATORY_DOCUMENT_TYPES}
        labels={DOCUMENT_TYPE_LABELS}
        documents={documents}
        isLoading={docsLoading}
        onVerify={(docId, status, reviewNote) => verifyDocMutation.mutateAsync({ docId, status, reviewNote })}
        isVerifying={verifyDocMutation.isPending}
        rejectTemplates={DOCUMENT_REJECTION_TEMPLATES}
      />

      {/* Achievements */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Achievements</h2>
        {achLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : achievements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border py-10 text-center">
            <FileX className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No achievements submitted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a, achIndex) => {
              const border =
                a.status === "APPROVED" ? "border-emerald-500/50"
                : a.status === "REJECTED" ? "border-red-500/50"
                : "border-border";
              return (
                <div key={a.id} className={`overflow-hidden rounded-xl border-2 ${border} bg-card`}>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(lightboxImages.length + achIndex)}
                    className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.viewUrl} alt={a.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                  </button>
                  <div className="border-t px-3 py-2">
                    <p className="text-sm font-medium">{a.title} <span className="font-normal text-muted-foreground">— {a.year}</span></p>
                    {a.description && <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>}
                    <div className="mt-1"><DocumentStatusBadge status={a.status} /></div>
                    {a.reviewNote && a.status === "REJECTED" && (
                      <p className="mt-1 text-[11px] text-red-600">Reason: {a.reviewNote}</p>
                    )}
                  </div>
                  {a.status !== "APPROVED" && (
                    <div className="flex gap-2 px-3 pb-3">
                      <Button size="sm" className="h-7 flex-1 text-[11px]" disabled={verifyAchMutation.isPending}
                        onClick={() => verifyAchMutation.mutate({ achId: a.id, status: "APPROVED" })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" disabled={verifyAchMutation.isPending}
                        onClick={() => setReviewingAch({ item: a, label: a.title })}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <DocumentReviewDialog
        open={!!reviewingAch}
        onOpenChange={(o) => !o && setReviewingAch(null)}
        subjectLabel={reviewingAch?.label ?? ""}
        rejectOnly
        onSubmit={async (status, reviewNote) => {
          if (!reviewingAch || status !== "REJECTED" || !reviewNote) return;
          await verifyAchMutation.mutateAsync({ achId: reviewingAch.item.id, status: "REJECTED", reviewNote });
        }}
      />

      <ImageLightbox
        images={allImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
