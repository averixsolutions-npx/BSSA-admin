import { athletesAdminService } from "@/lib/services/athletes-admin";
import type { AthleteProfile, SubmissionStatus } from "@/lib/types";

export interface ExportQuery {
  submissionStatusIn?: SubmissionStatus[]; // undefined = all statuses
  search?: string;
}

// Pages through the admin list endpoint and returns every matching athlete.
// Uses a large page size to minimise round-trips; stops when we've gathered
// meta.total (or a page comes back short, as a safety net).
export async function fetchAllAthletesForExport(
  query: ExportQuery,
  onProgress?: (loaded: number, total: number) => void
): Promise<AthleteProfile[]> {
  const limit = 100;
  let page = 1;
  const all: AthleteProfile[] = [];
  let total = Infinity;

  while (all.length < total) {
    const res = await athletesAdminService.list({
      page,
      limit,
      search: query.search || undefined,
      ...(query.submissionStatusIn && query.submissionStatusIn.length === 1
        ? { submissionStatus: query.submissionStatusIn[0] }
        : query.submissionStatusIn
          ? { submissionStatusIn: query.submissionStatusIn }
          : {}),
    });

    all.push(...res.items);
    total = res.meta.total ?? all.length;
    onProgress?.(all.length, total);

    if (res.items.length < limit) break; // no more pages
    page += 1;
    if (page > 1000) break; // hard safety cap
  }

  return all;
}
