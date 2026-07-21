"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { DocumentReviewDialog } from "@/components/document-review-dialog";
import type { VerificationStatus } from "@/lib/types";

export interface ReviewableDoc {
  id: string;
  type: string; // enum value
  status: VerificationStatus;
  reviewNote: string | null;
  viewUrl: string;
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
}: Props<DocType, Doc>) {
  const [reviewing, setReviewing] = useState<{ doc: Doc; label: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const uploadedDocs = allTypes
    .map((t) => documents.find((d) => d.type === t))
    .filter((d): d is Doc => !!d);

  const lightboxImages: LightboxImage[] = uploadedDocs.map((d) => ({
    url: d.viewUrl,
    label: labels[d.type as DocType],
  }));

  const approvedMandatoryCount = mandatoryTypes.filter((t) =>
    documents.some((d) => d.type === t && d.status === "APPROVED")
  ).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents</h2>
        {mandatoryTypes.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {approvedMandatoryCount}/{mandatoryTypes.length} mandatory approved
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {allTypes.map((type) => {
            const doc = documents.find((d) => d.type === type);
            const mandatory = mandatoryTypes.includes(type);
            const label = labels[type];

            if (!doc) {
              return (
                <div
                  key={type}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 p-3 text-center"
                >
                  <FileX className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {mandatory ? "Mandatory · not uploaded" : "Not uploaded"}
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
                : "border-border";

            return (
              <div key={type} className={`overflow-hidden rounded-xl border-2 ${border} bg-card`}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.viewUrl}
                    alt={label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                </button>

                <div className="border-t px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium">{label}</p>
                    {doc.status === "APPROVED" && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={11} /> APPROVED
                      </span>
                    )}
                    {doc.status === "REJECTED" && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-red-600">
                        <XCircle size={11} /> REJECTED
                      </span>
                    )}
                    {doc.status === "PENDING" && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-amber-600">
                        <AlertCircle size={11} /> PENDING
                      </span>
                    )}
                  </div>
                  {mandatory && <p className="mt-0.5 text-[10px] text-muted-foreground">Mandatory</p>}
                  {doc.reviewNote && doc.status === "REJECTED" && (
                    <p className="mt-1 text-[11px] leading-snug text-red-600">Reason: {doc.reviewNote}</p>
                  )}
                </div>

                {doc.status !== "APPROVED" && (
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
          })}
        </div>
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
    </section>
  );
}
