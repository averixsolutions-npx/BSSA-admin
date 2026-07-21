// ─── API response envelope ─────────────────────────────

export interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Meta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Domain types ──────────────────────────────────────

export type ContentStatus = "DRAFT" | "PUBLISHED";
export type MediaPlatform = "YOUTUBE" | "INSTAGRAM" | "TWITTER" | "FACEBOOK" | "VIMEO";
export type AccountRole = "ATHLETE" | "ASSOCIATION" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "BLACKLISTED";
export type SubmissionStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RESUBMITTED";

export interface AdminAccount {
  id: string;
  username: string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  headline: string;
  tag: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  text: string;
  href: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  coverUrl: string | null;
  body: string;
  pdfUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  venue: string;
  address: string | null;
  description: string | null;
  disciplineTag: string | null;
  startDate: string;
  endDate: string;
  resultsPdfUrl: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  results?: EventResult[];
}

export interface EventResult {
  id: string;
  eventId: string;
  rank: number;
  athleteOrTeam: string;
  state: string | null;
  category: string | null;
  resultValue: string;
  remarks: string | null;
  sortOrder: number;
}

export interface MediaItem {
  id: string;
  title: string;
  platform: MediaPlatform;
  sourceUrl: string;
  embedId: string | null;
  disciplineTag: string | null;
  eventTag: string | null;
  duration: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Discipline {
  id: string;
  slug: string;
  name: string;
  bannerUrl: string | null;
  description: string | null;
  selectionCriteria: string | null;
  history: string | null;
  sortOrder: number;
  status: ContentStatus;
}

export interface Program {
  id: string;
  slug: string;
  name: string;
  bannerUrl: string | null;
  body: string | null;
  sortOrder: number;
  status: ContentStatus;
}

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photoUrl: string | null;
  sortOrder: number;
}

export interface StateAssociation {
  id: string;
  name: string;
  state: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  sortOrder: number;
}

export interface SiteStat {
  id: string;
  key: string;
  value: string;
  label: string;
}

export interface AboutContent {
  id: string;
  key: string;
  body: string;
  updatedAt: string;
}

export interface AthleteSnapshot {
  fullName: string;
  dob: string;
  gender: string;
  discipline: string;
  state: string;
  address: string | null;
  photoUrl: string | null;
  coverUrl: string | null;
  snapshotAt: string;
}

export interface AthleteProfile {
  id: string;
  accountId: string;
  bssaId: string | null;
  fullName: string | null;
  dob: string | null;
  gender: string | null;
  discipline: string | null;
  state: string | null;
  address: string | null;
  photoUrl: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  submissionStatus: SubmissionStatus;
  submittedAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  approvedSnapshot: AthleteSnapshot | null;
  createdAt: string;
  updatedAt: string;
  account?: {
    mobile: string;
    email: string | null;
    mobileVerified: boolean;
    status: AccountStatus;
    statusReason: string | null;
  };
}

export interface AssociationSnapshot {
  name: string;
  state: string;
  incorporationNumber: string | null;
  president: string | null;
  treasurer: string | null;
  snapshotAt: string;
}

export interface AssociationProfile {
  id: string;
  accountId: string;
  bssaId: string | null;
  name: string | null;
  state: string | null;
  incorporationNumber: string | null;
  contactPerson: string | null;
  contactMobile: string | null;
  president: string | null;
  treasurer: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  submissionStatus: SubmissionStatus;
  submittedAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  approvedSnapshot: AssociationSnapshot | null;
  createdAt: string;
  updatedAt: string;
  account?: {
    mobile: string;
    email: string | null;
    status: AccountStatus;
    statusReason: string | null;
  };
}

// ─── Athlete documents & achievements ─────────────────

export type AthleteDocumentType =
  | "AADHAAR"
  | "PAN"
  | "TENTH_MARKSHEET"
  | "PASSPORT"
  | "HEALTH_INSURANCE"
  | "ANTI_DOPING_DECLARATION"
  | "FITNESS_CERTIFICATE";

export const MANDATORY_DOCUMENT_TYPES: AthleteDocumentType[] = ["AADHAAR", "PAN", "TENTH_MARKSHEET"];
export const OPTIONAL_DOCUMENT_TYPES: AthleteDocumentType[] = [
  "PASSPORT",
  "HEALTH_INSURANCE",
  "ANTI_DOPING_DECLARATION",
  "FITNESS_CERTIFICATE",
];
export const ALL_DOCUMENT_TYPES: AthleteDocumentType[] = [...MANDATORY_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES];

export const DOCUMENT_TYPE_LABELS: Record<AthleteDocumentType, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  TENTH_MARKSHEET: "10th Mark Sheet",
  PASSPORT: "Passport",
  HEALTH_INSURANCE: "Health Insurance Certificate",
  ANTI_DOPING_DECLARATION: "Anti-Doping Declaration",
  FITNESS_CERTIFICATE: "Fitness Certificate",
};

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AthleteDocument {
  id: string;
  athleteProfileId: string;
  type: AthleteDocumentType;
  fileKey: string;
  status: VerificationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  uploadedAt: string;
  updatedAt: string;
  viewUrl: string; // presigned — fresh on every fetch, treat as short-lived
}

export interface AthleteAchievement {
  id: string;
  athleteProfileId: string;
  title: string;
  year: number;
  description: string | null;
  proofFileKey: string;
  status: VerificationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  viewUrl: string;
}

// ─── Association documents ────────────────────────────

export type AssociationDocumentType =
  | "REGISTRATION_CERTIFICATE"
  | "PAN_CARD"
  | "BANK_PROOF"
  | "PRESIDENT_ID"
  | "TREASURER_ID"
  | "GST_CERTIFICATE"
  | "BYELAWS";

export const ALL_ASSOCIATION_DOCUMENT_TYPES: AssociationDocumentType[] = [
  "REGISTRATION_CERTIFICATE",
  "PAN_CARD",
  "BANK_PROOF",
  "PRESIDENT_ID",
  "TREASURER_ID",
  "GST_CERTIFICATE",
  "BYELAWS",
];

// Deliberately empty — all types are optional per backend spec.
export const MANDATORY_ASSOCIATION_DOCUMENT_TYPES: AssociationDocumentType[] = [];

export const ASSOCIATION_DOCUMENT_TYPE_LABELS: Record<AssociationDocumentType, string> = {
  REGISTRATION_CERTIFICATE: "Registration Certificate",
  PAN_CARD: "PAN Card",
  BANK_PROOF: "Bank Proof",
  PRESIDENT_ID: "President ID",
  TREASURER_ID: "Treasurer ID",
  GST_CERTIFICATE: "GST Certificate",
  BYELAWS: "Bye-laws",
};

export interface AssociationDocument {
  id: string;
  associationProfileId: string;
  type: AssociationDocumentType;
  fileKey: string;
  status: VerificationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  uploadedAt: string;
  updatedAt: string;
  viewUrl: string;
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  sourcePage: string | null;
  createdAt: string;
}

export interface NewsletterSignup {
  id: string;
  email: string;
  createdAt: string;
}

// ─── Presigned upload ──────────────────────────────────

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}
