import { api } from "@/lib/api-client";
import type { AthleteAchievement, VerificationStatus } from "@/lib/types";

export const athleteAchievementsService = {
  list: (athleteId: string) => api.get<AthleteAchievement[]>(`/admin/athletes/${athleteId}/achievements`),
  verify: (athleteId: string, achievementId: string, status: VerificationStatus, reviewNote?: string) =>
    api.patch<AthleteAchievement>(`/admin/athletes/${athleteId}/achievements/${achievementId}/verify`, {
      status,
      reviewNote,
    }),
};
