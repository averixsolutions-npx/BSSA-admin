import { api, getPaginated } from "@/lib/api-client";
import type { NewsArticle, ContentStatus } from "@/lib/types";

export interface NewsListParams {
  page: number;
  limit: number;
  status?: ContentStatus | "";
  category?: string;
}

export interface NewsCreateInput {
  title: string;
  category: string;
  coverUrl?: string;
  body: string;
  pdfUrl?: string;
}

export type NewsUpdateInput = Partial<NewsCreateInput>;

export const newsService = {
  list(params: NewsListParams) {
    return getPaginated<NewsArticle>("/admin/news", {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      category: params.category || undefined,
    });
  },

  getById(id: string) {
    return api.get<NewsArticle>(`/admin/news/${id}`);
  },

  create(input: NewsCreateInput) {
    return api.post<NewsArticle>("/admin/news", input);
  },

  update(id: string, input: NewsUpdateInput) {
    return api.patch<NewsArticle>(`/admin/news/${id}`, input);
  },

  publish(id: string) {
    return api.post<NewsArticle>(`/admin/news/${id}/publish`);
  },

  unpublish(id: string) {
    return api.post<NewsArticle>(`/admin/news/${id}/unpublish`);
  },

  remove(id: string) {
    return api.delete<void>(`/admin/news/${id}`);
  },
};
