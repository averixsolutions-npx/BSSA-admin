import { api } from "@/lib/api-client";
import type { SiteStat } from "@/lib/types";

export const statsService = {
  list: () => api.get<SiteStat[]>("/admin/stats"),
  upsert: (input: { key: string; value: string; label: string }) => api.post<SiteStat>("/admin/stats", input),
  update: (id: string, input: Partial<SiteStat>) => api.patch<SiteStat>(`/admin/stats/${id}`, input),
  remove: (id: string) => api.delete(`/admin/stats/${id}`),
};
