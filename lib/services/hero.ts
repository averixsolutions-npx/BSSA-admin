import { api } from "@/lib/api-client";
import type { HeroSlide } from "@/lib/types";

export const heroService = {
  list: () => api.get<HeroSlide[]>("/admin/hero"),
  getById: (id: string) => api.get<HeroSlide>(`/admin/hero/${id}`),
  create: (input: Partial<HeroSlide>) => api.post<HeroSlide>("/admin/hero", input),
  update: (id: string, input: Partial<HeroSlide>) => api.patch<HeroSlide>(`/admin/hero/${id}`, input),
  publish: (id: string) => api.post<HeroSlide>(`/admin/hero/${id}/publish`),
  unpublish: (id: string) => api.post<HeroSlide>(`/admin/hero/${id}/unpublish`),
  remove: (id: string) => api.delete(`/admin/hero/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) => api.post("/admin/hero/reorder", { items }),
};
