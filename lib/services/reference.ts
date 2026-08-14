import { api } from "@/lib/api-client";

export interface IndianState {
  code: string;
  name: string;
  type: "STATE" | "UT";
  aliases: string[];
}

export const referenceService = {
  states: () => api.get<IndianState[]>("/reference/states"),
  resultCategories: () => api.get<string[]>("/reference/result-categories"),
};
