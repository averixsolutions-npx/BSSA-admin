import { api } from "@/lib/api-client";
import type { Announcement } from "@/lib/types";

export const announcementsService = {
  list: () => api.get<Announcement[]>("/admin/announcements"),
  getById: (id: string) => api.get<Announcement>(`/admin/announcements/${id}`),
  create: (input: Partial<Announcement>) => api.post<Announcement>("/admin/announcements", input),
  update: (id: string, input: Partial<Announcement>) =>
    api.patch<Announcement>(`/admin/announcements/${id}`, input),
  remove: (id: string) => api.delete(`/admin/announcements/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) =>
    api.post("/admin/announcements/reorder", { items }),
};
