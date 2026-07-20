"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { athletesAdminService } from "@/lib/services/athletes-admin";
import { athleteDocumentsService } from "@/lib/services/athlete-documents";
import { athleteAchievementsService } from "@/lib/services/athlete-achievements";
import {
  ALL_DOCUMENT_TYPES,
  MANDATORY_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type AthleteDocument,
  type AthleteAchievement,
  type VerificationStatus,
} from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { DocumentReviewDialog } from "@/components/document-review-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AthleteDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [reviewing, setReviewing] = useState<
    | { kind: "document"; item: AthleteDocument; label: string }
    | { kind: "achievement"; item: AthleteAchievement; label: string }
    | null
  >(null);

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
  const readyToPublish = approvedMandatoryCount === MANDATORY_DOCUMENT_TYPES.length;

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.push("/athletes")} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />Back to athletes
      </Button>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-muted shrink-0 border">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
          )}
        </div>
        <PageHeader
          title={profile.fullName}
          description={
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {profile.bssaId && <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{profile.bssaId}</span>}
              <AccountStatusBadge status={profile.account?.status} />
              <Badge variant={profile.isPublished ? "success" : "secondary"}>{profile.isPublished ? "Published" : "Not published"}</Badge>
              <span className="text-sm text-muted-foreground">{profile.discipline} · {profile.state}</span>
            </div>
          }
        />
      </div>

      {/* Publish readiness */}
      <div className={`rounded-lg border p-4 text-sm ${readyToPublish ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
        <span className="font-medium">
          {readyToPublish
            ? "All mandatory documents are approved — this profile is eligible to publish."
            : `${approvedMandatoryCount}/${MANDATORY_DOCUMENT_TYPES.length} mandatory documents approved — cannot publish yet.`}
        </span>
      </div>

      {/* Documents */}
      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Identity documents</h2>
        {docsLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="divide-y rounded-lg border">
            {ALL_DOCUMENT_TYPES.map((type) => {
              const doc = documents.find((d) => d.type === type);
              const mandatory = MANDATORY_DOCUMENT_TYPES.includes(type);
              return (
                <div key={type} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium text-sm">
                      {DOCUMENT_TYPE_LABELS[type]}
                      {mandatory && <span className="ml-2 text-xs text-muted-foreground">(mandatory)</span>}
                    </p>
                    {doc ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Uploaded {format(new Date(doc.uploadedAt), "d MMM yyyy")}
                        {doc.reviewNote && ` · Note: ${doc.reviewNote}`}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Not uploaded yet</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc ? (
                      <>
                        <DocumentStatusBadge status={doc.status} />
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.viewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />View</a>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setReviewing({ kind: "document", item: doc, label: DOCUMENT_TYPE_LABELS[type] })}
                        >
                          Review
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary">Pending upload</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Achievements */}
      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Achievements</h2>
        {achLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg">No achievements submitted yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-sm">{a.title} <span className="text-muted-foreground font-normal">— {a.year}</span></p>
                  {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                  {a.reviewNote && <p className="text-xs text-muted-foreground mt-0.5">Note: {a.reviewNote}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DocumentStatusBadge status={a.status} />
                  <Button variant="outline" size="sm" asChild>
                    <a href={a.viewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />View proof</a>
                  </Button>
                  <Button size="sm" onClick={() => setReviewing({ kind: "achievement", item: a, label: a.title })}>
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <DocumentReviewDialog
        open={!!reviewing}
        onOpenChange={(o) => !o && setReviewing(null)}
        subjectLabel={reviewing?.label ?? ""}
        onSubmit={async (status, reviewNote) => {
          if (!reviewing) return;
          if (reviewing.kind === "document") {
            await verifyDocMutation.mutateAsync({ docId: reviewing.item.id, status, reviewNote });
          } else {
            await verifyAchMutation.mutateAsync({ achId: reviewing.item.id, status, reviewNote });
          }
        }}
      />
    </div>
  );
}
