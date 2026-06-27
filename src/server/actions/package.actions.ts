"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getPackagesList,
  getPackageById,
  createPackage,
  updatePackage,
  type PackageRow,
} from "@/server/repositories/platform.repository";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import { ROLES } from "@/lib/permissions/roles";

async function requirePlatformOwner() {
  const authResult = await getCurrentUser();
  if (!authResult.user) {
    throw new Error("Unauthorized");
  }
  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER
  );
  if (!isPlatformOwner) {
    throw new Error("Akses ditolak. Hanya Platform Owner yang dapat mengakses panel ini.");
  }
}

export async function getPackagesListAction(): Promise<ActionResult<PackageRow[]>> {
  try {
    await requirePlatformOwner();
    const data = await getPackagesList();
    return successResult(data);
  } catch (err: any) {
    console.error("[Package] getPackagesListAction:", err.message);
    return errorResult(err.message || "Gagal memuat daftar paket.");
  }
}

export async function getPackageAction(id: string): Promise<ActionResult<PackageRow | null>> {
  try {
    await requirePlatformOwner();
    const data = await getPackageById(id);
    return successResult(data);
  } catch (err: any) {
    console.error("[Package] getPackageAction:", err.message);
    return errorResult(err.message || "Gagal memuat paket.");
  }
}

export async function createPackageAction(input: {
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  maxBranches: number;
  maxUsers: number;
  maxStorageMb: number;
  maxTransactions: number;
}): Promise<ActionResult<PackageRow>> {
  try {
    await requirePlatformOwner();

    if (!input.name || input.name.trim().length === 0) {
      return errorResult("Nama paket tidak boleh kosong.");
    }
    if (!input.slug || input.slug.trim().length === 0) {
      return errorResult("Slug paket tidak boleh kosong.");
    }

    const data = await createPackage(input);
    return successResult(data);
  } catch (err: any) {
    console.error("[Package] createPackageAction:", err.message);
    return errorResult(err.message || "Gagal membuat paket.");
  }
}

export async function updatePackageAction(id: string, input: {
  name?: string;
  description?: string | null;
  price?: number;
  maxBranches?: number;
  maxUsers?: number;
  maxStorageMb?: number;
  maxTransactions?: number;
  isActive?: boolean;
}): Promise<ActionResult<PackageRow>> {
  try {
    await requirePlatformOwner();
    const data = await updatePackage(id, input);
    return successResult(data);
  } catch (err: any) {
    console.error("[Package] updatePackageAction:", err.message);
    return errorResult(err.message || "Gagal memperbarui paket.");
  }
}
