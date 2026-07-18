import { api } from "@/lib/api-client";
import type { Program, ContentStatus } from "@/lib/types";

export const programsService = {
  list: (status?: ContentStatus) => api.get<Program[]>("/admin/programs", { status }),
  getById: (id: string) => api.get<Program>(`/admin/programs/${id}`),
  create: (input: Partial<Program>) => api.post<Program>("/admin/programs", input),
  update: (id: string, input: Partial<Program>) => api.patch<Program>(`/admin/programs/${id}`, input),
  publish: (id: string) => api.post<Program>(`/admin/programs/${id}/publish`),
  unpublish: (id: string) => api.post<Program>(`/admin/programs/${id}/unpublish`),
  remove: (id: string) => api.delete(`/admin/programs/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) => api.post("/admin/programs/reorder", { items }),
};
