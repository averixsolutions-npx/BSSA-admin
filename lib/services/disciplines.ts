import { api } from "@/lib/api-client";
import type { Discipline, ContentStatus } from "@/lib/types";

export const disciplinesService = {
  list: (status?: ContentStatus) => api.get<Discipline[]>("/admin/disciplines", { status }),
  getById: (id: string) => api.get<Discipline>(`/admin/disciplines/${id}`),
  create: (input: Partial<Discipline>) => api.post<Discipline>("/admin/disciplines", input),
  update: (id: string, input: Partial<Discipline>) => api.patch<Discipline>(`/admin/disciplines/${id}`, input),
  publish: (id: string) => api.post<Discipline>(`/admin/disciplines/${id}/publish`),
  unpublish: (id: string) => api.post<Discipline>(`/admin/disciplines/${id}/unpublish`),
  remove: (id: string) => api.delete(`/admin/disciplines/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) => api.post("/admin/disciplines/reorder", { items }),
};
