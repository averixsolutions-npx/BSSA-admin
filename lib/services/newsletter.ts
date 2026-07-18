import { api } from "@/lib/api-client";
import type { NewsletterSignup } from "@/lib/types";

export const newsletterService = {
  list: () => api.get<NewsletterSignup[]>("/admin/newsletter"),
  exportCsv: () => api.getText("/admin/newsletter/export"),
};
