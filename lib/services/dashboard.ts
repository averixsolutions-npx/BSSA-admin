import { getPaginated } from "@/lib/api-client";
import type { NewsArticle, Event, AthleteProfile, Enquiry } from "@/lib/types";

export const dashboardService = {
  async getStats() {
    const [news, events, athletes, enquiries] = await Promise.all([
      getPaginated<NewsArticle>("/admin/news", { page: 1, limit: 1, status: "PUBLISHED" }),
      getPaginated<Event>("/admin/events", { page: 1, limit: 1, state: "upcoming" }),
      getPaginated<AthleteProfile>("/admin/athletes", { page: 1, limit: 1 }),
      getPaginated<Enquiry>("/admin/enquiry", { page: 1, limit: 1 }),
    ]);
    return {
      publishedNews: news.meta.total,
      upcomingEvents: events.meta.total,
      registeredAthletes: athletes.meta.total,
      totalEnquiries: enquiries.meta.total,
    };
  },
};
