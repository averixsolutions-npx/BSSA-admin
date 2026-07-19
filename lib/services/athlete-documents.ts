import { api } from "@/lib/api-client";
import type { AthleteDocument, VerificationStatus } from "@/lib/types";

export const athleteDocumentsService = {
  list: (athleteId: string) => api.get<AthleteDocument[]>(`/admin/athletes/${athleteId}/documents`),
  verify: (athleteId: string, docId: string, status: VerificationStatus, reviewNote?: string) =>
    api.patch<AthleteDocument>(`/admin/athletes/${athleteId}/documents/${docId}/verify`, {
      status,
      reviewNote,
    }),
};
