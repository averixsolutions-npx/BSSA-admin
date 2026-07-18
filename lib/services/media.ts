import { api, getPaginated } from "@/lib/api-client";
import type { MediaItem, MediaPlatform, ContentStatus } from "@/lib/types";

export const mediaService = {
  list: (params: { page: number; limit: number; platform?: MediaPlatform; status?: ContentStatus }) =>
    getPaginated<MediaItem>("/admin/media", params),
  getById: (id: string) => api.get<MediaItem>(`/admin/media/${id}`),
  create: (input: Partial<MediaItem>) => api.post<MediaItem>("/admin/media", input),
  update: (id: string, input: Partial<MediaItem>) => api.patch<MediaItem>(`/admin/media/${id}`, input),
  publish: (id: string) => api.post<MediaItem>(`/admin/media/${id}/publish`),
  unpublish: (id: string) => api.post<MediaItem>(`/admin/media/${id}/unpublish`),
  remove: (id: string) => api.delete(`/admin/media/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) => api.post("/admin/media/reorder", { items }),
};
