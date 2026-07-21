import { getPaginated, api } from "@/lib/api-client";
import type { AssociationProfile } from "@/lib/types";

export const associationsAdminService = {
  list: (params: { page: number; limit: number; search?: string; state?: string; isPublished?: boolean }) =>
    getPaginated<AssociationProfile>("/admin/associations", {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      state: params.state || undefined,
      isPublished: params.isPublished,
    }),
  getById: (id: string) => api.get<AssociationProfile>(`/admin/associations/${id}`),
  setPublished: (id: string, isPublished: boolean) =>
    api.patch<AssociationProfile>(`/admin/associations/${id}/publish`, { isPublished }),
  setStatus: (id: string, status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED", reason?: string) =>
    api.patch<AssociationProfile>(`/admin/associations/${id}/status`, { status, reason }),
  remove: (id: string) => api.delete(`/admin/associations/${id}`),
};
