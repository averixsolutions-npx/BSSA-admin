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
  getById: (id: string) => api.get<AthleteProfile>(`/admin/athletes/${id}`),
  setPublished: (id: string, isPublished: boolean) =>
    api.patch<AthleteProfile>(`/admin/athletes/${id}/publish`, { isPublished }),
  setStatus: (id: string, status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED", reason?: string) =>
    api.patch<AthleteProfile>(`/admin/athletes/${id}/status`, { status, reason }),
  remove: (id: string) => api.delete(`/admin/athletes/${id}`),
};
