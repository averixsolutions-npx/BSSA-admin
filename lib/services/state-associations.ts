import { api } from "@/lib/api-client";
import type { StateAssociation } from "@/lib/types";

export const stateAssociationsService = {
  list: () => api.get<StateAssociation[]>("/admin/state-associations"),
  getById: (id: string) => api.get<StateAssociation>(`/admin/state-associations/${id}`),
  create: (input: Partial<StateAssociation>) => api.post<StateAssociation>("/admin/state-associations", input),
  update: (id: string, input: Partial<StateAssociation>) => api.patch<StateAssociation>(`/admin/state-associations/${id}`, input),
  remove: (id: string) => api.delete(`/admin/state-associations/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) => api.post("/admin/state-associations/reorder", { items }),
};
