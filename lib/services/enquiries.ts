import { getPaginated } from "@/lib/api-client";
import type { Enquiry } from "@/lib/types";

export const enquiriesService = {
  list: (params: { page: number; limit: number }) =>
    getPaginated<Enquiry>("/admin/enquiry", params),
};
