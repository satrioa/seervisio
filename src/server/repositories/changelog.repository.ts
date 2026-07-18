import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type {
  ChangelogVersion,
  ChangelogItem,
  ChangelogCategory,
  ChangelogStatus,
  ChangelogFilters,
  CreateChangelogInput,
  CreateChangelogItemInput,
} from "@/types/changelog";

function mapVersion(row: any): ChangelogVersion {
  return {
    id: row.id,
    version: row.version,
    slug: row.slug,
    releaseDate: row.release_date,
    title: row.title,
    summary: row.summary ?? null,
    coverImage: row.cover_image ?? null,
    featured: row.featured ?? false,
    status: (row.status ?? "draft") as ChangelogStatus,
    publishedAt: row.published_at ?? null,
    metaTitle: row.meta_title ?? null,
    metaDescription: row.meta_description ?? null,
    ogImage: row.og_image ?? null,
    ctaText: row.cta_text ?? null,
    ctaLink: row.cta_link ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.changelog_items ?? []).map(mapItem).sort((a: ChangelogItem, b: ChangelogItem) => a.orderIndex - b.orderIndex),
  };
}

function mapItem(row: any): ChangelogItem {
  return {
    id: row.id,
    versionId: row.version_id,
    category: row.category as ChangelogCategory,
    title: row.title,
    description: row.description ?? null,
    mediaUrl: row.media_url ?? null,
    mediaType: row.media_type ?? null,
    orderIndex: row.order_index ?? 0,
    createdAt: row.created_at,
  };
}

function generateSlug(version: string, title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const v = version.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${v}-${base}`;
}

export async function getReleases(filters?: ChangelogFilters): Promise<ChangelogVersion[]> {
  const supabase = createServiceRoleSupabaseClient();
  let query = (supabase as any)
    .from("changelog_versions")
    .select("*, changelog_items(*), profiles!changelog_versions_created_by_fkey(name)")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    const q = `%${filters.search}%`;
    query = query.or(`version.ilike.${q},title.ilike.${q}`);
  }

  if (filters?.sort) {
    const sortMap: Record<string, { column: string; asc: boolean }> = {
      newest: { column: "created_at", asc: false },
      oldest: { column: "created_at", asc: true },
      version: { column: "version", asc: false },
      release_date: { column: "release_date", asc: false },
    };
    const s = sortMap[filters.sort] ?? sortMap.newest;
    query = query.order(s.column, { ascending: s.asc });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVersion);
}

export async function getRelease(id: string): Promise<ChangelogVersion | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("changelog_versions")
    .select("*, changelog_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapVersion(data) : null;
}

export async function getReleaseBySlug(slug: string): Promise<ChangelogVersion | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("changelog_versions")
    .select("*, changelog_items(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapVersion(data) : null;
}

export async function getPublishedReleases(): Promise<ChangelogVersion[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("changelog_versions")
    .select("*, changelog_items(*)")
    .eq("status", "published")
    .order("release_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVersion);
}

export async function getLatestRelease(): Promise<ChangelogVersion | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("changelog_versions")
    .select("*, changelog_items(*)")
    .eq("status", "published")
    .order("release_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapVersion(data) : null;
}

export async function createRelease(
  input: CreateChangelogInput,
  createdBy: string,
): Promise<ChangelogVersion> {
  const supabase = createServiceRoleSupabaseClient();
  const slug = input.slug || generateSlug(input.version, input.title);

  const { data, error } = await (supabase as any)
    .from("changelog_versions")
    .insert({
      version: input.version,
      slug,
      title: input.title,
      release_date: input.releaseDate,
      summary: input.summary ?? null,
      cover_image: input.coverImage ?? null,
      featured: input.featured ?? false,
      status: input.status ?? "draft",
      meta_title: input.metaTitle ?? null,
      meta_description: input.metaDescription ?? null,
      og_image: input.ogImage ?? null,
      cta_text: input.ctaText ?? null,
      cta_link: input.ctaLink ?? null,
      created_by: createdBy,
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select("id, version, slug")
    .single();
  if (error) throw new Error(error.message);

  if (input.items && input.items.length > 0) {
    await createReleaseItemsBulk(data.id, input.items);
  }

  const release = await getRelease(data.id);
  if (!release) throw new Error("Failed to fetch created release");
  return release;
}

async function createReleaseItemsBulk(
  versionId: string,
  items: CreateChangelogItemInput[],
): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const rows = items.map((item, i) => ({
    version_id: versionId,
    category: item.category,
    title: item.title,
    description: item.description ?? null,
    media_url: item.mediaUrl ?? null,
    media_type: item.mediaType ?? null,
    order_index: item.orderIndex ?? i + 1,
  }));
  const { error } = await (supabase as any)
    .from("changelog_items")
    .insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateRelease(
  id: string,
  input: Partial<CreateChangelogInput>,
): Promise<ChangelogVersion> {
  const supabase = createServiceRoleSupabaseClient();
  const updateData: Record<string, unknown> = {};

  if (input.version !== undefined) updateData.version = input.version;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.releaseDate !== undefined) updateData.release_date = input.releaseDate;
  if (input.summary !== undefined) updateData.summary = input.summary;
  if (input.coverImage !== undefined) updateData.cover_image = input.coverImage;
  if (input.featured !== undefined) updateData.featured = input.featured;
  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === "published") {
      updateData.published_at = new Date().toISOString();
    }
  }
  if (input.metaTitle !== undefined) updateData.meta_title = input.metaTitle;
  if (input.metaDescription !== undefined) updateData.meta_description = input.metaDescription;
  if (input.ogImage !== undefined) updateData.og_image = input.ogImage;
  if (input.ctaText !== undefined) updateData.cta_text = input.ctaText;
  if (input.ctaLink !== undefined) updateData.cta_link = input.ctaLink;

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("changelog_versions")
      .update(updateData)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  if (input.items !== undefined) {
    const { error: delErr } = await (supabase as any)
      .from("changelog_items")
      .delete()
      .eq("version_id", id);
    if (delErr) throw new Error(delErr.message);

    if (input.items.length > 0) {
      await createReleaseItemsBulk(id, input.items);
    }
  }

  const release = await getRelease(id);
  if (!release) throw new Error("Failed to fetch updated release");
  return release;
}

export async function publishRelease(id: string): Promise<ChangelogVersion> {
  return updateRelease(id, { status: "published" });
}

export async function archiveRelease(id: string): Promise<ChangelogVersion> {
  return updateRelease(id, { status: "archived" });
}

export async function deleteDraft(id: string): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const { error: delErr } = await (supabase as any)
    .from("changelog_versions")
    .delete()
    .eq("id", id)
    .eq("status", "draft");
  if (delErr) throw new Error(delErr.message);
}

export async function getReleasesCountByStatus(): Promise<Record<string, number>> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("changelog_versions")
    .select("status");
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = { total: 0, draft: 0, published: 0, scheduled: 0, archived: 0 };
  for (const row of data ?? []) {
    counts.total++;
    const s = row.status as string;
    if (counts[s] !== undefined) counts[s]++;
  }
  return counts;
}

export async function createReleaseItem(input: CreateChangelogItemInput & { versionId: string }): Promise<ChangelogItem> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("changelog_items")
    .insert({
      version_id: input.versionId,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      media_url: input.mediaUrl ?? null,
      media_type: input.mediaType ?? null,
      order_index: input.orderIndex ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapItem(data);
}

export async function updateReleaseItem(id: string, input: Partial<CreateChangelogItemInput>): Promise<ChangelogItem> {
  const supabase = createServiceRoleSupabaseClient();
  const updateData: Record<string, unknown> = {};
  if (input.category !== undefined) updateData.category = input.category;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.mediaUrl !== undefined) updateData.media_url = input.mediaUrl;
  if (input.mediaType !== undefined) updateData.media_type = input.mediaType;
  if (input.orderIndex !== undefined) updateData.order_index = input.orderIndex;

  const { data, error } = await (supabase as any)
    .from("changelog_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapItem(data);
}

export async function deleteReleaseItem(id: string): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await (supabase as any)
    .from("changelog_items")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function logRead(profileId: string | null, releaseId: string): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  await (supabase as any)
    .from("changelog_read_logs")
    .insert({ profile_id: profileId, release_id: releaseId });
}

export async function updateLastSeenVersion(profileId: string, version: string): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  await (supabase as any)
    .from("user_preferences")
    .upsert(
      { profile_id: profileId, last_seen_version: version },
      { onConflict: "profile_id" },
    );
}

export async function getLastSeenVersion(profileId: string): Promise<string | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data } = await (supabase as any)
    .from("user_preferences")
    .select("last_seen_version")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data?.last_seen_version ?? null;
}
