import { api } from "@/lib/api-client";
import type { AssociationDocument, VerificationStatus } from "@/lib/types";

export const associationDocumentsService = {
  list: (associationId: string) =>
    api.get<AssociationDocument[]>(`/admin/associations/${associationId}/documents`),

  verify: (
    associationId: string,
    docId: string,
    status: VerificationStatus,
    reviewNote?: string
  ) =>
    api.patch<AssociationDocument>(
      `/admin/associations/${associationId}/documents/${docId}/verify`,
      { status, reviewNote }
    ),
};
