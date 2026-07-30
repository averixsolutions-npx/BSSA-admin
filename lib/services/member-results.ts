import { api } from "@/lib/api-client";
import type { MemberPastResult, VerificationStatus } from "@/lib/types";

export const memberResultsService = {
  list: (athleteId: string) => api.get<MemberPastResult[]>(`/admin/athletes/${athleteId}/results`),
  verify: (athleteId: string, resultId: string, status: VerificationStatus, reviewNote?: string) =>
    api.patch<MemberPastResult>(`/admin/athletes/${athleteId}/results/${resultId}/verify`, {
      status,
      reviewNote,
    }),
};
