export type ChangelogStatus = "draft" | "published" | "scheduled" | "archived";

export type ChangelogCategory =
  | "feature"
  | "improvement"
  | "bugfix"
  | "breaking"
  | "security"
  | "uiux"
  | "performance";

export const CATEGORY_LABEL: Record<ChangelogCategory, string> = {
  feature: "Fitur Baru",
  improvement: "Improvement",
  bugfix: "Bug Fix",
  breaking: "Breaking Change",
  security: "Security",
  uiux: "UI/UX",
  performance: "Performance",
};

export const CATEGORY_EMOJI: Record<ChangelogCategory, string> = {
  feature: "✨",
  improvement: "🚀",
  bugfix: "🐛",
  breaking: "⚠",
  security: "🔒",
  uiux: "🎨",
  performance: "⚡",
};

export interface ChangelogItem {
  id: string;
  versionId: string;
  category: ChangelogCategory;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  orderIndex: number;
  createdAt: string;
}

export interface ChangelogVersion {
  id: string;
  version: string;
  slug: string;
  releaseDate: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  featured: boolean;
  status: ChangelogStatus;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  items: ChangelogItem[];
}

export interface ChangelogReadLog {
  id: string;
  profileId: string | null;
  releaseId: string;
  readAt: string;
}

export interface CreateChangelogInput {
  version: string;
  slug?: string;
  title: string;
  releaseDate: string;
  summary?: string;
  coverImage?: string;
  featured?: boolean;
  status?: ChangelogStatus;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ctaText?: string;
  ctaLink?: string;
  items?: CreateChangelogItemInput[];
}

export interface CreateChangelogItemInput {
  category: ChangelogCategory;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  orderIndex?: number;
}

export interface ChangelogFilters {
  search?: string;
  status?: ChangelogStatus | "all";
  sort?: "newest" | "oldest" | "version" | "release_date";
}
