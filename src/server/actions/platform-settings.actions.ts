"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import {
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
} from "@/server/repositories/platform-settings.repository";

async function requirePlatformOwner() {
  const authResult = await getCurrentUser();
  if (!authResult.user) {
    throw new Error("Unauthorized");
  }
  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER,
  );
  if (!isPlatformOwner) {
    throw new Error("Access denied. Platform Owner only.");
  }
}

export async function getPlatformSettingsAction(): Promise<
  ActionResult<PlatformSettings | null>
> {
  try {
    await requirePlatformOwner();
    const data = await getPlatformSettings();
    return successResult(data);
  } catch (err: any) {
    console.error("[Settings] getPlatformSettingsAction:", err.message);
    return errorResult(err.message || "Failed to load settings.");
  }
}

export async function updatePlatformSettingsAction(
  settings: Partial<Omit<PlatformSettings, "id" | "updatedAt">>,
): Promise<ActionResult<PlatformSettings | null>> {
  try {
    await requirePlatformOwner();
    const data = await updatePlatformSettings(settings);
    return successResult(data);
  } catch (err: any) {
    console.error("[Settings] updatePlatformSettingsAction:", err.message);
    return errorResult(err.message || "Failed to update settings.");
  }
}
