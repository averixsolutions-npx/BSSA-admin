import { api, getPaginated } from "@/lib/api-client";
import type { Event, EventResult, ContentStatus } from "@/lib/types";

export interface EventListParams {
  page: number;
  limit: number;
  status?: ContentStatus | "";
  state?: "ongoing" | "upcoming" | "past" | "";
}

export interface EventCreateInput {
  title: string;
  venue: string;
  address?: string;
  description?: string;
  disciplineTag?: string;
  startDate: string;
  endDate: string;
  resultsPdfUrl?: string;
}

export type EventUpdateInput = Partial<EventCreateInput>;

export interface ResultCreateInput {
  rank: number;
  athleteOrTeam: string;
  state?: string;
  category?: string;
  resultValue: string;
  remarks?: string;
  sortOrder?: number;
}

export type ResultUpdateInput = Partial<ResultCreateInput>;

export const eventsService = {
  list: (p: EventListParams) =>
    getPaginated<Event>("/admin/events", {
      page: p.page, limit: p.limit,
      status: p.status || undefined,
      state: p.state || undefined,
    }),
  getById: (id: string) => api.get<Event>(`/admin/events/${id}`),
  create: (input: EventCreateInput) => api.post<Event>("/admin/events", input),
  update: (id: string, input: EventUpdateInput) => api.patch<Event>(`/admin/events/${id}`, input),
  publish: (id: string) => api.post<Event>(`/admin/events/${id}/publish`),
  unpublish: (id: string) => api.post<Event>(`/admin/events/${id}/unpublish`),
  remove: (id: string) => api.delete(`/admin/events/${id}`),

  // Nested results
  listResults: (eventId: string) => api.get<EventResult[]>(`/admin/events/${eventId}/results`),
  createResult: (eventId: string, input: ResultCreateInput) =>
    api.post<EventResult>(`/admin/events/${eventId}/results`, input),
  updateResult: (eventId: string, resultId: string, input: ResultUpdateInput) =>
    api.patch<EventResult>(`/admin/events/${eventId}/results/${resultId}`, input),
  removeResult: (eventId: string, resultId: string) =>
    api.delete(`/admin/events/${eventId}/results/${resultId}`),
};
