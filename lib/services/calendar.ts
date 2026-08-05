import { api } from "@/lib/api-client";
import type { CalendarEntry, ContentStatus } from "@/lib/types";

export const calendarService = {
  list: (status?: ContentStatus) => api.get<CalendarEntry[]>("/admin/calendar", { status }),
  getById: (id: string) => api.get<CalendarEntry>(`/admin/calendar/${id}`),
  create: (input: Partial<CalendarEntry>) => api.post<CalendarEntry>("/admin/calendar", input),
  update: (id: string, input: Partial<CalendarEntry>) => api.patch<CalendarEntry>(`/admin/calendar/${id}`, input),
  publish: (id: string) => api.post<CalendarEntry>(`/admin/calendar/${id}/publish`),
  unpublish: (id: string) => api.post<CalendarEntry>(`/admin/calendar/${id}/unpublish`),
  remove: (id: string) => api.delete(`/admin/calendar/${id}`),
};
