"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import { successResult, errorResult, type ActionResult } from "./action-helper";
import {
  getReleases,
  getRelease,
  getReleaseBySlug,
  getPublishedReleases,
  getLatestRelease,
  createRelease,
  updateRelease,
  publishRelease,
  archiveRelease,
  deleteDraft,
  getReleasesCountByStatus,
  logRead,
  updateLastSeenVersion,
  getLastSeenVersion,
} from "@/server/repositories/changelog.repository";
import type {
  ChangelogVersion,
  ChangelogFilters,
  CreateChangelogInput,
} from "@/types/changelog";

async function requirePlatformOwner() {
  const auth = await getCurrentUser();
  if (!auth.user) throw new Error("Unauthorized");
  const isPlatformOwner = auth.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER,
  );
  if (!isPlatformOwner) {
    throw new Error("Akses ditolak. Hanya Platform Owner yang dapat mengakses panel ini.");
  }
  return auth;
}

export async function getChangelogsAction(
  filters?: ChangelogFilters,
): Promise<ActionResult<{ releases: ChangelogVersion[]; counts: Record<string, number> }>> {
  try {
    await requirePlatformOwner();
    const [releases, counts] = await Promise.all([
      getReleases(filters),
      getReleasesCountByStatus(),
    ]);
    return successResult({ releases, counts });
  } catch (err: any) {
    console.error("[Changelog] getChangelogsAction:", err.message);
    return errorResult(err.message || "Gagal memuat changelog.");
  }
}

export async function getChangelogAction(
  id: string,
): Promise<ActionResult<ChangelogVersion | null>> {
  try {
    await requirePlatformOwner();
    const release = await getRelease(id);
    return successResult(release);
  } catch (err: any) {
    console.error("[Changelog] getChangelogAction:", err.message);
    return errorResult(err.message || "Gagal memuat release.");
  }
}

export async function createChangelogAction(
  input: CreateChangelogInput,
): Promise<ActionResult<ChangelogVersion>> {
  try {
    const auth = await requirePlatformOwner();
    const release = await createRelease(input, auth.user.profileId);
    return successResult(release);
  } catch (err: any) {
    console.error("[Changelog] createChangelogAction:", err.message);
    return errorResult(err.message || "Gagal membuat release.");
  }
}

export async function updateChangelogAction(
  id: string,
  input: Partial<CreateChangelogInput>,
): Promise<ActionResult<ChangelogVersion>> {
  try {
    await requirePlatformOwner();
    const release = await updateRelease(id, input);
    return successResult(release);
  } catch (err: any) {
    console.error("[Changelog] updateChangelogAction:", err.message);
    return errorResult(err.message || "Gagal mengupdate release.");
  }
}

export async function publishChangelogAction(
  id: string,
): Promise<ActionResult<ChangelogVersion>> {
  try {
    await requirePlatformOwner();
    const release = await publishRelease(id);
    return successResult(release);
  } catch (err: any) {
    console.error("[Changelog] publishChangelogAction:", err.message);
    return errorResult(err.message || "Gagal mempublish release.");
  }
}

export async function archiveChangelogAction(
  id: string,
): Promise<ActionResult<ChangelogVersion>> {
  try {
    await requirePlatformOwner();
    const release = await archiveRelease(id);
    return successResult(release);
  } catch (err: any) {
    console.error("[Changelog] archiveChangelogAction:", err.message);
    return errorResult(err.message || "Gagal mengarsipkan release.");
  }
}

export async function deleteChangelogDraftAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await requirePlatformOwner();
    await deleteDraft(id);
    return successResult(undefined);
  } catch (err: any) {
    console.error("[Changelog] deleteChangelogDraftAction:", err.message);
    return errorResult(err.message || "Gagal menghapus draft.");
  }
}

// Public / Landing page actions (no auth required)

export async function getChangelogVersionsAction(): Promise<
  ActionResult<ChangelogVersion[]>
> {
  try {
    const data = await getPublishedReleases();
    return successResult(data);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat changelog.");
  }
}

export async function getChangelogVersionBySlugAction(
  slug: string,
): Promise<ActionResult<ChangelogVersion | null>> {
  try {
    const data = await getReleaseBySlug(slug);
    return successResult(data);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat release.");
  }
}

export async function getLatestChangelogAction(): Promise<
  ActionResult<ChangelogVersion | null>
> {
  try {
    const data = await getLatestRelease();
    return successResult(data);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat release terbaru.");
  }
}

// Read tracking

export async function logChangelogReadAction(
  releaseId: string,
): Promise<ActionResult<void>> {
  try {
    const auth = await getCurrentUser();
    await logRead(auth.user?.profileId ?? null, releaseId);
    if (auth.user) {
      const release = await getRelease(releaseId);
      if (release) {
        await updateLastSeenVersion(auth.user.profileId, release.version);
      }
    }
    return successResult(undefined);
  } catch (err: any) {
    return errorResult(err.message || "Gagal mencatat pembacaan.");
  }
}

export async function getLastSeenVersionAction(): Promise<
  ActionResult<string | null>
> {
  try {
    const auth = await getCurrentUser();
    if (!auth.user) return successResult(null);
    const version = await getLastSeenVersion(auth.user.profileId);
    return successResult(version);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat versi terakhir.");
  }
}
