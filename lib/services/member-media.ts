import { api } from "@/lib/api-client";
import type { MemberMedia } from "@/lib/types";

export const memberMediaService = {
  listForAthlete: (athleteId: string) => api.get<MemberMedia[]>(`/admin/athletes/${athleteId}/media`),
  listForAssociation: (assocId: string) => api.get<MemberMedia[]>(`/admin/associations/${assocId}/media`),
};
