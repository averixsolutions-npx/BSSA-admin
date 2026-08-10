"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ArrowLeft, Award, Lock, Medal, ShieldAlert, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

import { athletesAdminService } from "@/lib/services/athletes-admin";
import { athleteDocumentsService } from "@/lib/services/athlete-documents";
import { athleteAchievementsService } from "@/lib/services/athlete-achievements";
import { memberMediaService } from "@/lib/services/member-media";
import { memberResultsService } from "@/lib/services/member-results";
import {
  DOCUMENT_TYPE_LABELS,
  requiredDocTypesFor,
  visibleDocTypesFor,
  type AthleteAchievement,
  type AthleteDocument,
  type AthleteDocumentType,
  type AthleteProfile,
  type MemberPastResult,
  type VerificationStatus,
} from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { ApproveRejectBar } from "@/components/approve-reject-bar";
import { CopyChip } from "@/components/copy-chip";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { PendingChangesBanner } from "@/components/pending-changes-banner";
import { ProfileHeaderCard } from "@/components/profile-header-card";
import { RejectionReasonBanner } from "@/components/rejection-reason-banner";
import { SectionCard } from "@/components/section-card";
import { DocumentsReviewGrid } from "@/components/documents-review-grid";
import { DOCUMENT_REJECTION_TEMPLATES } from "@/components/rejection-templates";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { DocumentReviewDialog } from "@/components/document-review-dialog";
import { ProfileActionsBar } from "@/components/profile-actions-bar";
import { ModerationDialog } from "@/components/moderation-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { MemberMediaGallery } from "@/components/member-media-gallery";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Compact timing strip for the admin: when the athlete registered, when they
// last touched their profile, and when (if ever) they submitted. All three
// fields already come back on the profile object — this is pure display.
function TimingStrip({
  createdAt,
  updatedAt,
  submittedAt,
}: {
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}) {
  const item = (label: string, iso: string | null) => (
    <div className="flex flex-col">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      {iso ? (
        <span className="text-sm text-foreground" title={format(new Date(iso), "d MMM yyyy, HH:mm")}>
          {format(new Date(iso), "d MMM yyyy")}{" "}
          <span className="text-xs text-muted-foreground">
            ({formatDistanceToNow(new Date(iso), { addSuffix: true })})
          </span>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </div>
  );

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-border bg-card px-4 py-3">
      {item("Registered", createdAt)}
      {item("Last active", updatedAt)}
      {item("Submitted", submittedAt)}
    </div>
  );
}

// DRAFT-only breakdown of what the athlete still hasn't completed. Helps the
// admin see why a draft is stuck (and, if they want, nudge the athlete). Uses
// the same mandatory-field list the athlete's own wizard enforces, plus the
// required document types for their chosen Aadhaar layout.
function DraftGapReport({
  profile,
  documents,
  requiredTypes,
  labels,
}: {
  profile: AthleteProfile;
  documents: AthleteDocument[];
  requiredTypes: AthleteDocumentType[];
  labels: Record<string, string>;
}) {
  // Mandatory profile fields — mirrors the athlete-side Step 1 gate.
  const missingFields: string[] = [
    !profile.photoUrl && "Profile photo",
    !profile.firstName && "First name",
    !profile.lastName && "Last name",
    !profile.dob && "Date of birth",
    !profile.gender && "Gender",
    (profile.disciplines?.length ?? 0) === 0 && "Discipline",
    !profile.state && "State",
    !profile.account?.mobile && "WhatsApp number",
  ].filter(Boolean) as string[];

  const aadhaarAnswered = profile.aadhaarLayout !== null && profile.aadhaarLayout !== undefined;

  // Required documents not yet uploaded (any status counts as "uploaded" here —
  // this report is about what's MISSING, not what's approved).
  const missingDocs = aadhaarAnswered
    ? requiredTypes.filter((t) => !documents.some((d) => d.type === t)).map((t) => labels[t] ?? t)
    : [];

  const nothingMissing =
    missingFields.length === 0 && aadhaarAnswered && missingDocs.length === 0;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Draft — not yet submitted</p>
          <p className="text-xs text-muted-foreground">
            What this athlete still needs to complete before their profile can be submitted.
          </p>
        </div>
      </div>

      {nothingMissing ? (
        <p className="text-sm text-foreground">
          Everything required is filled in and all required documents are uploaded — the
          athlete just hasn&apos;t pressed submit yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Profile fields
            </p>
            {missingFields.length === 0 ? (
              <p className="text-sm text-emerald-600">All complete</p>
            ) : (
              <ul className="space-y-0.5 text-sm text-foreground">
                {missingFields.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Aadhaar question
            </p>
            <p className={`text-sm ${aadhaarAnswered ? "text-emerald-600" : "text-foreground"}`}>
              {aadhaarAnswered ? "Answered" : "Not answered yet"}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Required documents
            </p>
            {!aadhaarAnswered ? (
              <p className="text-sm text-muted-foreground">Pending Aadhaar answer</p>
            ) : missingDocs.length === 0 ? (
              <p className="text-sm text-emerald-600">All uploaded</p>
            ) : (
              <ul className="space-y-0.5 text-sm text-foreground">
                {missingDocs.map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AthleteDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  // Go back to the list the way we came, preserving its ?bucket= filter.
  const goBackToList = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/athletes");
    }
  };

  const [reviewingAch, setReviewingAch] = useState<{ item: AthleteAchievement; label: string } | null>(null);
  const [reviewingResult, setReviewingResult] = useState<{ item: MemberPastResult; label: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [moderating, setModerating] = useState<"SUSPENDED" | "BLACKLISTED" | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const { data: media = [] } = useQuery({
    queryKey: ["athlete-media", id],
    queryFn: () => memberMediaService.listForAthlete(id),
    enabled: !!id,
  });

  const { data: pastResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["athlete-results", id],
    queryFn: () => memberResultsService.list(id),
    enabled: !!id,
  });

  const verifyResultMutation = useMutation({
    mutationFn: ({ resultId, status, reviewNote }: { resultId: string; status: VerificationStatus; reviewNote?: string }) =>
      memberResultsService.verify(id, resultId, status, reviewNote),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["athlete-results", id] });
      toast.success(v.status === "APPROVED" ? "Result approved" : "Result rejected");
    },
    onError: (e) => toast.error("Couldn't record that verdict", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const verifyDocMutation = useMutation({
    mutationFn: ({ docId, status, reviewNote }: { docId: string; status: VerificationStatus; reviewNote?: string }) =>
      athleteDocumentsService.verify(id, docId, status, reviewNote),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["athlete-documents", id] });
      toast.success(v.status === "APPROVED" ? "Document approved" : "Document rejected");
    },
    onError: (e) => toast.error("Couldn't record that verdict", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const verifyAchMutation = useMutation({
    mutationFn: ({ achId, status, reviewNote }: { achId: string; status: VerificationStatus; reviewNote?: string }) =>
      athleteAchievementsService.verify(id, achId, status, reviewNote),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["athlete-achievements", id] });
      toast.success(v.status === "APPROVED" ? "Achievement approved" : "Achievement rejected");
    },
    onError: (e) => toast.error("Couldn't record that verdict", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const approveProfileMutation = useMutation({
    mutationFn: () => athletesAdminService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes", "detail", id] });
      qc.invalidateQueries({ queryKey: ["athletes", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "athletes"] });
      toast.success("Profile approved");
    },
    onError: (e) => toast.error("Couldn't approve the profile", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const rejectProfileMutation = useMutation({
    mutationFn: (reviewNote: string) => athletesAdminService.reject(id, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes", "detail", id] });
      qc.invalidateQueries({ queryKey: ["athletes", "list"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "athletes"] });
      toast.success("Profile rejected — user has been notified");
    },
    onError: (e) => toast.error("Couldn't reject the profile", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED"; reason?: string }) =>
      athletesAdminService.setStatus(id, status, reason),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["athletes", "detail", id] });
      qc.invalidateQueries({ queryKey: ["athletes", "list"] });
      toast.success(v.status === "ACTIVE" ? "Account reactivated" : v.status === "SUSPENDED" ? "Account suspended" : "Account blacklisted");
    },
    onError: (e) => toast.error("Couldn't change the account status", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => athletesAdminService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes"] });
      qc.invalidateQueries({ queryKey: ["queue-counts", "athletes"] });
      toast.success("Athlete deleted");
      router.push("/athletes");
    },
    onError: (e) => toast.error("Couldn't delete the athlete", { description: e instanceof ApiCallError ? e.message : undefined }),
  });

  if (profileLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile) {
    return (
      <LoadError
        title="Couldn't load this athlete"
        backLabel="Back to athletes"
        onBack={() => router.push("/athletes")}
      />
    );
  }

  // Which documents are required depends on this athlete's Aadhaar layout.
  const requiredTypes = requiredDocTypesFor(profile.aadhaarLayout);
  // Rows to render: required-first, then optional — with the non-chosen Aadhaar
  // variant dropped. Append any already-uploaded type not in that set so no
  // uploaded document is ever hidden.
  const visibleTypes = visibleDocTypesFor(profile.aadhaarLayout);
  const extraUploaded = documents
    .map((d) => d.type)
    .filter((t, i, arr) => arr.indexOf(t) === i && !visibleTypes.includes(t));
  const docTypesToShow = [...visibleTypes, ...extraUploaded];
  const approvedMandatoryCount = requiredTypes.filter((t) =>
    documents.some((d) => d.type === t && d.status === "APPROVED")
  ).length;
  const canApprove = approvedMandatoryCount === requiredTypes.length;
  const blockedReason = !canApprove
    ? `Approve all required documents first (${approvedMandatoryCount}/${requiredTypes.length})`
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
          {
            label: "Disciplines",
            before: profile.approvedSnapshot.disciplines?.join(", ") ?? null,
            after: profile.disciplines?.join(", ") ?? null,
          },
          { label: "State", before: profile.approvedSnapshot.state, after: profile.state },
          { label: "Address", before: profile.approvedSnapshot.address, after: profile.address },
        ]
      : [];

  // Uploaded docs, in display order — the lightbox navigates across these.
  const uploadedDocs = docTypesToShow
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

  // Past results with a proof upload — these follow the achievements in the lightbox.
  const resultsWithProof = pastResults.filter((r): r is MemberPastResult & { viewUrl: string } => !!r.viewUrl);
  const resultImages: LightboxImage[] = resultsWithProof.map((r) => ({
    url: r.viewUrl,
    label: `${r.eventName} — proof`,
  }));

  const allImages: LightboxImage[] = [...lightboxImages, ...achievementImages, ...resultImages];

  const accountStatus = profile.account?.status ?? "ACTIVE";
  const pendingAchievements = achievements.filter((a) => a.status === "PENDING").length;
  const pendingResults = pastResults.filter((r) => r.status === "PENDING").length;
  const hasAbout = Boolean(profile.bio || profile.instagramUrl || profile.youtubeUrl || profile.facebookUrl);

  const cardBorder = (status: VerificationStatus) =>
    status === "APPROVED" ? "border-emerald-500/50" : status === "REJECTED" ? "border-red-500/50" : "border-amber-500/40";

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={goBackToList} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />Back to athletes
      </Button>

      <ProfileHeaderCard
        name={profile.fullName ?? "Unnamed draft"}
        photoUrl={profile.photoUrl}
        badges={
          <>
            <AccountStatusBadge status={profile.account?.status} />
            <SubmissionStatusBadge status={profile.submissionStatus} />
            <Badge variant={profile.isPublished ? "success" : "secondary"}>
              {profile.isPublished ? "Published" : "Not published"}
            </Badge>
            {profile.aadhaarLayout && (
              <Badge variant="outline">
                Aadhaar: {profile.aadhaarLayout === "FRONT_BACK" ? "Front + Back" : "Single page"}
              </Badge>
            )}
          </>
        }
        meta={
          <>
            {profile.disciplines?.length ? profile.disciplines.join(", ") : "No discipline"} ·{" "}
            {profile.state ?? "No state"}
          </>
        }
        chips={
          <>
            {profile.bssaId && <CopyChip value={profile.bssaId} label="Member ID" />}
            {profile.fisId && <CopyChip value={profile.fisId} label="FIS ID" prefix="FIS " />}
            {profile.account?.email && <CopyChip value={profile.account.email} label="Email" />}
            {profile.account?.mobile && (
              <CopyChip value={profile.account.mobile} label="Mobile number" title="Contact mobile (optional profile field)" />
            )}
          </>
        }
      />

      <TimingStrip
        createdAt={profile.createdAt}
        updatedAt={profile.updatedAt}
        submittedAt={profile.submittedAt}
      />

      {profile.submissionStatus === "DRAFT" && (
        <DraftGapReport
          profile={profile}
          documents={documents}
          requiredTypes={requiredTypes}
          labels={DOCUMENT_TYPE_LABELS}
        />
      )}

      {/* ── Why you're here: the review verdict ── */}
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

      {/* Why the account is suspended/blacklisted, if it is. */}
      {profile.account && accountStatus !== "ACTIVE" && profile.account.statusReason && (
        <Alert variant="destructive">
          <ShieldAlert />
          <div className="space-y-1">
            <AlertTitle>{accountStatus === "BLACKLISTED" ? "Blacklisted" : "Suspended"}</AlertTitle>
            <AlertDescription>{profile.account.statusReason}</AlertDescription>
          </div>
        </Alert>
      )}

      <DocumentsReviewGrid
        allTypes={docTypesToShow}
        mandatoryTypes={requiredTypes}
        labels={DOCUMENT_TYPE_LABELS}
        documents={documents}
        isLoading={docsLoading}
        onVerify={(docId, status, reviewNote) => verifyDocMutation.mutateAsync({ docId, status, reviewNote })}
        isVerifying={verifyDocMutation.isPending}
        rejectTemplates={DOCUMENT_REJECTION_TEMPLATES}
      />

      {/* ── Achievements ── */}
      <SectionCard
        title="Achievements"
        description={
          achievements.length > 0
            ? `${achievements.length} submitted by the athlete.`
            : "Medals and honours the athlete has claimed, with proof."
        }
        icon={Award}
        tone="amber"
        action={pendingAchievements > 0 ? <Badge variant="warning">{pendingAchievements} pending</Badge> : undefined}
      >
        {achLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : achievements.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No achievements submitted"
            description="Anything the athlete claims will appear here for verification."
            variant="inline"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a, achIndex) => (
              <div key={a.id} className={cn("overflow-hidden rounded-xl border-2 bg-card", cardBorder(a.status))}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(lightboxImages.length + achIndex)}
                  className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted"
                  title={`Open proof for ${a.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.viewUrl} alt={a.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                </button>
                <div className="space-y-1 border-t px-3 py-2">
                  <p className="text-sm font-medium">
                    {a.title} <span className="font-normal text-muted-foreground">— {a.year}</span>
                  </p>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  <DocumentStatusBadge status={a.status} />
                  {a.reviewNote && a.status === "REJECTED" && (
                    <p className="text-[11px] text-red-600 dark:text-red-400">Reason: {a.reviewNote}</p>
                  )}
                </div>
                {a.status === "APPROVED" ? (
                  <p className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3 shrink-0" /> Locked after approval
                  </p>
                ) : (
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
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Self-declared past results ── */}
      <SectionCard
        title="Past results"
        description={
          pastResults.length > 0
            ? `${pastResults.length} declared by the athlete.`
            : "Results the athlete has declared from earlier events."
        }
        icon={Medal}
        tone="green"
        action={pendingResults > 0 ? <Badge variant="warning">{pendingResults} pending</Badge> : undefined}
      >
        {resultsLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pastResults.length === 0 ? (
          <EmptyState
            icon={Medal}
            title="No past results submitted"
            description="Declared results appear here for verification."
            variant="inline"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastResults.map((r) => {
              const proofIndex = resultsWithProof.findIndex((p) => p.id === r.id);
              const meta = [
                r.rank != null ? `Rank ${r.rank}` : null,
                r.timing,
                r.category,
                r.discipline,
                r.location,
              ].filter(Boolean);
              return (
                <div key={r.id} className={cn("overflow-hidden rounded-xl border-2 bg-card", cardBorder(r.status))}>
                  {r.viewUrl && proofIndex >= 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex(lightboxImages.length + achievementImages.length + proofIndex)
                      }
                      className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted"
                      title={`Open proof for ${r.eventName}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.viewUrl} alt={`${r.eventName} — proof`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                    </button>
                  )}
                  <div className="space-y-1 border-t px-3 py-2">
                    <p className="text-sm font-medium">
                      {r.eventName} <span className="font-normal text-muted-foreground">— {r.year}</span>
                    </p>
                    {meta.length > 0 && <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>}
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    {!r.viewUrl && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">No proof uploaded</p>
                    )}
                    <DocumentStatusBadge status={r.status} />
                    {r.reviewNote && r.status === "REJECTED" && (
                      <p className="text-[11px] text-red-600 dark:text-red-400">Reason: {r.reviewNote}</p>
                    )}
                  </div>
                  {r.status === "APPROVED" ? (
                    <p className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3 shrink-0" /> Locked after approval
                    </p>
                  ) : (
                    <div className="flex gap-2 px-3 pb-3">
                      <Button size="sm" className="h-7 flex-1 text-[11px]" disabled={verifyResultMutation.isPending}
                        onClick={() => verifyResultMutation.mutate({ resultId: r.id, status: "APPROVED" })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" disabled={verifyResultMutation.isPending}
                        onClick={() => setReviewingResult({ item: r, label: `${r.eventName} — ${r.year}` })}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <MemberMediaGallery items={media} />

      {/* Member-authored bio & social links (read-only for admins) */}
      {hasAbout && (
        <SectionCard
          title="About"
          description="Written by the member for their public profile."
          icon={UserRound}
          tone="slate"
          collapsible
          defaultOpen={false}
        >
          {profile.bio && <p className="whitespace-pre-line text-sm text-muted-foreground">{profile.bio}</p>}
          <div className="flex flex-wrap gap-3 text-xs">
            {profile.instagramUrl && <a href={profile.instagramUrl} target="_blank" rel="noreferrer" className="underline">Instagram</a>}
            {profile.youtubeUrl && <a href={profile.youtubeUrl} target="_blank" rel="noreferrer" className="underline">YouTube</a>}
            {profile.facebookUrl && <a href={profile.facebookUrl} target="_blank" rel="noreferrer" className="underline">Facebook</a>}
          </div>
        </SectionCard>
      )}

      {/* Moderation lives at the bottom, folded unless the account isn't active. */}
      <SectionCard
        title="Account actions"
        description="Suspending or blacklisting stops the member logging in. Deleting removes everything, permanently."
        icon={ShieldAlert}
        tone="rose"
        collapsible
        defaultOpen={accountStatus !== "ACTIVE"}
      >
        <ProfileActionsBar
          status={accountStatus}
          onSuspend={() => setModerating("SUSPENDED")}
          onBlacklist={() => setModerating("BLACKLISTED")}
          onReactivate={() => setReactivating(true)}
          onDelete={() => setDeleting(true)}
          isPending={statusMutation.isPending || deleteMutation.isPending}
        />
      </SectionCard>

      <DocumentReviewDialog
        open={!!reviewingResult}
        onOpenChange={(o) => !o && setReviewingResult(null)}
        subjectLabel={reviewingResult?.label ?? ""}
        rejectOnly
        onSubmit={async (status, reviewNote) => {
          if (!reviewingResult || status !== "REJECTED" || !reviewNote) return;
          await verifyResultMutation.mutateAsync({ resultId: reviewingResult.item.id, status: "REJECTED", reviewNote });
        }}
      />

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

      <ModerationDialog
        open={!!moderating}
        onOpenChange={(o) => !o && setModerating(null)}
        action={moderating}
        subjectName={profile.fullName ?? "this athlete"}
        onConfirm={async (reason) => {
          if (moderating) await statusMutation.mutateAsync({ status: moderating, reason });
        }}
      />
      <ConfirmDialog
        open={reactivating}
        onOpenChange={setReactivating}
        title="Reactivate athlete?"
        description={`${profile.fullName ?? "This athlete"} will be able to log in again and reappear on the public roster.`}
        confirmLabel="Reactivate"
        onConfirm={async () => { await statusMutation.mutateAsync({ status: "ACTIVE" }); }}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${profile.fullName ?? "this athlete"}?`}
        description="This permanently deletes the account, profile, documents, achievements, and all uploaded files from storage. This cannot be undone."
        confirmLabel="Delete permanently"
        destructive
        onConfirm={async () => { await deleteMutation.mutateAsync(); }}
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
