"use client";
import { useState } from "react";
import { FileCheck2, FileX, FileText, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/disclosure";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { DocumentReviewDialog } from "@/components/document-review-dialog";
import type { VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// A document may be an image (JPG/PNG/WebP) or a PDF — the upload flow allows both.
// <img> can't render a PDF (that's what produced the "doc icon only" bug), so we
// detect PDFs and give them their own tile + iframe preview. fileKey carries the
// real extension set at presign time; the presigned viewUrl is the fallback.
function isPdfDoc(doc: { fileKey?: string; viewUrl?: string }): boolean {
  const key = (doc.fileKey ?? "").toLowerCase();
  if (key.endsWith(".pdf")) return true;
  try {
    // viewUrl is presigned with query params; check only the path segment.
    const path = new URL(doc.viewUrl ?? "").pathname.toLowerCase();
    return path.endsWith(".pdf");
  } catch {
    return false;
  }
}

export interface ReviewableDoc {
  id: string;
  type: string; // enum value
  status: VerificationStatus;
  reviewNote: string | null;
  viewUrl: string;
  fileKey: string; // used to detect PDF vs image for correct preview rendering
}

interface Props<DocType extends string, Doc extends ReviewableDoc> {
  allTypes: readonly DocType[];
  mandatoryTypes: readonly DocType[];
  labels: Record<DocType, string>;
  documents: Doc[];
  isLoading: boolean;
  onVerify: (docId: string, status: VerificationStatus, reviewNote?: string) => Promise<unknown>;
  isVerifying?: boolean;
  /** Templates shown as chips in the reject dialog. */
  rejectTemplates?: string[];
  title?: string;
}

export function DocumentsReviewGrid<DocType extends string, Doc extends ReviewableDoc>({
  allTypes,
  mandatoryTypes,
  labels,
  documents,
  isLoading,
  onVerify,
  isVerifying,
  rejectTemplates,
  title = "Documents",
}: Props<DocType, Doc>) {
  const [reviewing, setReviewing] = useState<{ doc: Doc; label: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const docFor = (type: DocType) => documents.find((d) => d.type === type);

  // What stays on screen: everything required, plus every optional slot that
  // already holds a document. Only empty optional slots fold away (P2) — a
  // required or filled slot is never hidden.
  const alwaysVisible = allTypes.filter((t) => mandatoryTypes.includes(t) || !!docFor(t));
  const foldedOptional = allTypes.filter((t) => !mandatoryTypes.includes(t) && !docFor(t));

  // Lightbox order follows display order so the arrows walk the page top-down.
  const orderedTypes = [...alwaysVisible, ...foldedOptional];
  const uploadedDocs = orderedTypes.map(docFor).filter((d): d is Doc => !!d);
  const lightboxImages: LightboxImage[] = uploadedDocs.map((d) => ({
    url: d.viewUrl,
    label: labels[d.type as DocType],
    isPdf: isPdfDoc(d),
  }));

  const approvedMandatoryCount = mandatoryTypes.filter(
    (t) => docFor(t)?.status === "APPROVED"
  ).length;
  const allMandatoryApproved =
    mandatoryTypes.length > 0 && approvedMandatoryCount === mandatoryTypes.length;
  const pendingCount = documents.filter((d) => d.status === "PENDING").length;

  const renderCard = (type: DocType) => {
    const doc = docFor(type);
    const mandatory = mandatoryTypes.includes(type);
    const label = labels[type];

    if (!doc) {
      return (
        <div
          key={type}
          className={cn(
            "flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center",
            mandatory ? "border-amber-500/40 bg-amber-500/5" : "bg-muted/30"
          )}
        >
          <FileX className={cn("h-5 w-5", mandatory ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
          <div>
            <p className="text-xs font-medium">{label}</p>
            <p className="text-[11px] text-muted-foreground">
              {mandatory ? "Required · not uploaded" : "Not uploaded"}
            </p>
          </div>
        </div>
      );
    }

    const idx = uploadedDocs.findIndex((d) => d.id === doc.id);
    const border =
      doc.status === "APPROVED"
        ? "border-emerald-500/50"
        : doc.status === "REJECTED"
        ? "border-red-500/50"
        : "border-amber-500/40";

    const pdf = isPdfDoc(doc);

    return (
      <div key={type} className={cn("overflow-hidden rounded-xl border-2 bg-card", border)}>
        <button
          type="button"
          onClick={() => setLightboxIndex(idx)}
          className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted"
          title={`Open ${label}`}
        >
          {pdf ? (
            // PDFs can't render in <img>. Show a clear document tile that still
            // opens the file (via the lightbox, which handles PDFs in an iframe).
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/60 text-muted-foreground transition-colors group-hover:bg-muted">
              <FileText className="h-8 w-8" />
              <span className="text-[11px] font-medium">PDF · click to open</span>
            </span>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.viewUrl}
                alt={label}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            </>
          )}
        </button>

        <div className="space-y-1 border-t px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium">{label}</p>
            {mandatory && <span className="shrink-0 text-[10px] text-muted-foreground">Required</span>}
          </div>
          <DocumentStatusBadge status={doc.status} />
          {doc.reviewNote && doc.status === "REJECTED" && (
            <p className="text-[11px] leading-snug text-red-600 dark:text-red-400">
              Reason: {doc.reviewNote}
            </p>
          )}
        </div>

        {doc.status === "APPROVED" ? (
          // Approved is a verdict, not a draft — no control here can quietly
          // undo it. (The server rejects the change too.)
          <p className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" /> Locked after approval
          </p>
        ) : (
          <div className="flex gap-2 px-3 pb-3">
            <Button
              size="sm"
              className="h-7 flex-1 text-[11px]"
              disabled={isVerifying}
              onClick={() => onVerify(doc.id, "APPROVED")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-[11px]"
              disabled={isVerifying}
              onClick={() => setReviewing({ doc, label })}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <SectionCard
      title={title}
      description={
        mandatoryTypes.length > 0
          ? "Required documents first. Approve each one before approving the profile."
          : "All document types are optional for this member."
      }
      icon={FileCheck2}
      tone="blue"
      action={
        mandatoryTypes.length > 0 ? (
          <Badge variant={allMandatoryApproved ? "success" : "warning"}>
            {approvedMandatoryCount}/{mandatoryTypes.length} required approved
          </Badge>
        ) : pendingCount > 0 ? (
          <Badge variant="warning">{pendingCount} pending</Badge>
        ) : undefined
      }
      contentClassName="space-y-4"
    >
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : alwaysVisible.length === 0 && foldedOptional.length === 0 ? (
        <EmptyState
          icon={FileX}
          title="No documents to review"
          description="Nothing has been uploaded for this member yet."
        />
      ) : (
        <>
          {alwaysVisible.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {alwaysVisible.map(renderCard)}
            </div>
          ) : (
            <EmptyState
              icon={FileX}
              title="Nothing uploaded yet"
              description="Optional document slots are listed below."
              variant="inline"
            />
          )}

          {foldedOptional.length > 0 && (
            <Disclosure
              label="Show optional documents"
              openLabel="Hide optional documents"
              count={foldedOptional.length}
              contentClassName="pt-1"
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {foldedOptional.map(renderCard)}
              </div>
            </Disclosure>
          )}
        </>
      )}

      <DocumentReviewDialog
        open={!!reviewing}
        onOpenChange={(o) => !o && setReviewing(null)}
        subjectLabel={reviewing?.label ?? ""}
        rejectOnly
        templates={rejectTemplates}
        onSubmit={async (status, reviewNote) => {
          if (!reviewing || status !== "REJECTED" || !reviewNote) return;
          await onVerify(reviewing.doc.id, "REJECTED", reviewNote);
        }}
      />

      <ImageLightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </SectionCard>
  );
}
