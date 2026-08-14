import { api, getPaginated } from "@/lib/api-client";
import type { Enquiry } from "@/lib/types";

export interface EnquiriesListParams {
  page: number;
  limit: number;
  q?: string;
}

export const enquiriesService = {
  list(params: EnquiriesListParams) {
    return getPaginated<Enquiry>("/admin/enquiry", {
      page: params.page,
      limit: params.limit,
      q: params.q?.trim() || undefined,
    });
  },

  getById(id: string) {
    return api.get<Enquiry>(`/admin/enquiry/${id}`);
  },

  remove(id: string) {
    return api.delete<void>(`/admin/enquiry/${id}`);
  },
};
