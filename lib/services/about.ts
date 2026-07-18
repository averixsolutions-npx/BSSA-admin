import { api } from "@/lib/api-client";
import type { AboutContent } from "@/lib/types";

export const aboutService = {
  list: () => api.get<AboutContent[]>("/admin/about"),
  getByKey: (key: string) => api.get<AboutContent>(`/admin/about/${key}`),
  update: (key: string, body: string) => api.patch<AboutContent>(`/admin/about/${key}`, { body }),
};
