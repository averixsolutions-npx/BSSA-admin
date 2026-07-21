import { getPaginated, api } from "@/lib/api-client";
import type { AssociationProfile, SubmissionStatus } from "@/lib/types";

export const associationsAdminService = {
  list: (params: {
    page: number;
    limit: number;
    search?: string;
    state?: string;
    isPublished?: boolean;
    submissionStatus?: SubmissionStatus;
    submissionStatusIn?: SubmissionStatus[];
  }) =>
    getPaginated<AssociationProfile>("/admin/associations", {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      state: params.state || undefined,
      isPublished: params.isPublished,
      submissionStatus: params.submissionStatus,
      submissionStatusIn: params.submissionStatusIn?.join(",") || undefined,
    }),

  getById: (id: string) => api.get<AssociationProfile>(`/admin/associations/${id}`),

  approve: (id: string) => api.post<AssociationProfile>(`/admin/associations/${id}/approve`),
  reject: (id: string, reviewNote: string) =>
    api.post<AssociationProfile>(`/admin/associations/${id}/reject`, { reviewNote }),

  setPublished: (id: string, isPublished: boolean) =>
    api.patch<AssociationProfile>(`/admin/associations/${id}/publish`, { isPublished }),

  setStatus: (id: string, status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED", reason?: string) =>
    api.patch<AssociationProfile>(`/admin/associations/${id}/status`, { status, reason }),

  remove: (id: string) => api.delete(`/admin/associations/${id}`),
};
