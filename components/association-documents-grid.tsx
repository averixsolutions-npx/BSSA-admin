"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { associationDocumentsService } from "@/lib/services/association-documents";
import {
  ALL_ASSOCIATION_DOCUMENT_TYPES,
  MANDATORY_ASSOCIATION_DOCUMENT_TYPES,
  ASSOCIATION_DOCUMENT_TYPE_LABELS,
} from "@/lib/types";
import type { VerificationStatus } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { DocumentsReviewGrid } from "./documents-review-grid";
import { DOCUMENT_REJECTION_TEMPLATES } from "./rejection-templates";

export function AssociationDocumentsGrid({ associationId }: { associationId: string }) {
  const qc = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["association-documents", associationId],
    queryFn: () => associationDocumentsService.list(associationId),
    enabled: !!associationId,
  });

  const verifyMutation = useMutation({
    mutationFn: (v: { docId: string; status: VerificationStatus; reviewNote?: string }) =>
      associationDocumentsService.verify(associationId, v.docId, v.status, v.reviewNote),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["association-documents", associationId] });
      qc.invalidateQueries({ queryKey: ["associations", "detail", associationId] });
      toast.success(v.status === "APPROVED" ? "Document approved" : "Document rejected");
    },
    onError: (e) =>
      toast.error("Couldn't record that verdict", {
        description: e instanceof ApiCallError ? e.message : undefined,
      }),
  });

  return (
    <DocumentsReviewGrid
      allTypes={ALL_ASSOCIATION_DOCUMENT_TYPES}
      mandatoryTypes={MANDATORY_ASSOCIATION_DOCUMENT_TYPES}
      labels={ASSOCIATION_DOCUMENT_TYPE_LABELS}
      documents={documents}
      isLoading={isLoading}
      onVerify={(docId, status, reviewNote) =>
        verifyMutation.mutateAsync({ docId, status, reviewNote })
      }
      isVerifying={verifyMutation.isPending}
      rejectTemplates={DOCUMENT_REJECTION_TEMPLATES}
    />
  );
}
