import type { AthleteProfile } from "@/lib/types";

export interface ExportColumn {
  key: string;
  header: string;
  // Pull a display string out of an athlete row.
  get: (a: AthleteProfile) => string;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";

// The full set of exportable columns. The modal lets the admin toggle these;
// order here is the order in the file.
export const ATHLETE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "bssaId", header: "BSSA Code", get: (a) => a.bssaId ?? "" },
  { key: "fullName", header: "Full name", get: (a) => a.fullName ?? "" },
  { key: "firstName", header: "First name", get: (a) => a.firstName ?? "" },
  { key: "lastName", header: "Last name", get: (a) => a.lastName ?? "" },
  { key: "email", header: "Email", get: (a) => a.account?.email ?? "" },
  { key: "mobile", header: "WhatsApp / Mobile", get: (a) => a.account?.mobile ?? "" },
  { key: "gender", header: "Gender", get: (a) => a.gender ?? "" },
  { key: "dob", header: "Date of birth", get: (a) => fmtDate(a.dob) },
  { key: "disciplines", header: "Disciplines", get: (a) => a.disciplines?.join(", ") ?? "" },
  { key: "state", header: "State", get: (a) => a.state ?? "" },
  { key: "fisId", header: "FIS code", get: (a) => a.fisId ?? "" },
  { key: "address", header: "Address", get: (a) => a.address ?? "" },
  { key: "submissionStatus", header: "Review status", get: (a) => a.submissionStatus },
  { key: "accountStatus", header: "Account status", get: (a) => a.account?.status ?? "" },
  { key: "isPublished", header: "Published", get: (a) => (a.isPublished ? "Yes" : "No") },
  { key: "registeredAt", header: "Registered", get: (a) => fmtDate(a.createdAt) },
  { key: "lastActiveAt", header: "Last active", get: (a) => fmtDate(a.updatedAt) },
  { key: "submittedAt", header: "Submitted", get: (a) => fmtDate(a.submittedAt) },
];

// Default selection — the columns most admins want, so the modal isn't overwhelming.
export const DEFAULT_EXPORT_KEYS = [
  "bssaId", "fullName", "email", "mobile", "gender", "dob",
  "disciplines", "state", "submissionStatus", "accountStatus", "submittedAt",
];

export function toRows(
  athletes: AthleteProfile[],
  columns: ExportColumn[]
): Record<string, string>[] {
  return athletes.map((a) => {
    const row: Record<string, string> = {};
    for (const c of columns) row[c.header] = c.get(a);
    return row;
  });
}
