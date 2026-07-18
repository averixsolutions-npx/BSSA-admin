import { api } from "@/lib/api-client";
import type { CommitteeMember } from "@/lib/types";

export const committeeService = {
  list: () => api.get<CommitteeMember[]>("/admin/committee"),
  getById: (id: string) => api.get<CommitteeMember>(`/admin/committee/${id}`),
  create: (input: Partial<CommitteeMember>) => api.post<CommitteeMember>("/admin/committee", input),
  update: (id: string, input: Partial<CommitteeMember>) => api.patch<CommitteeMember>(`/admin/committee/${id}`, input),
  remove: (id: string) => api.delete(`/admin/committee/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) => api.post("/admin/committee/reorder", { items }),
};
