import { getPaginated, api } from "@/lib/api-client";
import type { AthleteProfile } from "@/lib/types";

export const athletesAdminService = {
  list: (params: { page: number; limit: number; search?: string; discipline?: string; state?: string; isPublished?: boolean }) =>
    getPaginated<AthleteProfile>("/admin/athletes", {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      discipline: params.discipline || undefined,
      state: params.state || undefined,
      isPublished: params.isPublished,
    }),
  setPublished: (id: string, isPublished: boolean) =>
    api.patch<AthleteProfile>(`/admin/athletes/${id}/publish`, { isPublished }),
  remove: (id: string) => api.delete(`/admin/athletes/${id}`),
};
