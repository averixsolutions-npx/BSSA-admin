"use client";
import { useQuery } from "@tanstack/react-query";
import { getPaginated } from "@/lib/api-client";
import type { AthleteProfile, AssociationProfile } from "@/lib/types";

async function fetchCounts(role: "athletes" | "associations") {
  const [pending, approved, rejected, draft] = await Promise.all([
    getPaginated<AthleteProfile | AssociationProfile>(`/admin/${role}`, {
      page: 1,
      limit: 1,
      submissionStatusIn: "SUBMITTED,RESUBMITTED",
    }),
    getPaginated<AthleteProfile | AssociationProfile>(`/admin/${role}`, {
      page: 1,
      limit: 1,
      submissionStatus: "APPROVED",
    }),
    getPaginated<AthleteProfile | AssociationProfile>(`/admin/${role}`, {
      page: 1,
      limit: 1,
      submissionStatus: "REJECTED",
    }),
    getPaginated<AthleteProfile | AssociationProfile>(`/admin/${role}`, {
      page: 1,
      limit: 1,
      submissionStatus: "DRAFT",
    }),
  ]);
  return {
    PENDING: pending.meta.total,
    APPROVED: approved.meta.total,
    REJECTED: rejected.meta.total,
    DRAFT: draft.meta.total,
  };
}

export function useQueueCounts(role: "athletes" | "associations") {
  return useQuery({
    queryKey: ["queue-counts", role],
    queryFn: () => fetchCounts(role),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
