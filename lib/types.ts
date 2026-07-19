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

export interface AthleteProfile {
  id: string;
  accountId: string;
  bssaId: string | null;
  fullName: string;
  dob: string;
  gender: string;
  discipline: string;
  state: string;
  address: string | null;
  photoUrl: string | null;
  isPublished: boolean;
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

export interface AssociationProfile {
  id: string;
  accountId: string;
  bssaId: string | null;
  name: string;
  state: string;
  incorporationNumber: string | null;
  contactPerson: string;
  contactMobile: string;
  president: string | null;
  treasurer: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  account?: {
    mobile: string;
    email: string | null;
    status: AccountStatus;
    statusReason: string | null;
  };
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
