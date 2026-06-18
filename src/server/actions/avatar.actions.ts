"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadProfileAvatarAction(
  brandSlug: string,
  profileId: string,
  formData: FormData,
): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    const isOwnProfile = session.profileId === profileId;
    if (!isOwnProfile) {
      requireActionPermission(session.role, "user.manage");
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return errorResult("File tidak ditemukan.");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResult("Format file tidak didukung. Gunakan JPG, PNG, atau WebP.");
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResult("File terlalu besar. Maksimal 5MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const timestamp = Date.now();
    const filePath = `${session.brandId}/${profileId}/avatar-${timestamp}.${ext}`;

    const adminDb = createServiceRoleSupabaseClient() as any;

    console.log("[Avatar] upload target", {
      bucket: AVATAR_BUCKET,
      path: filePath,
      profileId,
      brandId: session.brandId,
      contentType: file.type,
      size: file.size,
    });

    const { error: uploadError } = await adminDb.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      if (uploadError.message?.includes("Bucket not found")) {
        console.error("[Avatar] Bucket not found", { bucket: AVATAR_BUCKET, path: filePath, error: uploadError });
        return errorResult(`Bucket ${AVATAR_BUCKET} belum dibuat di Supabase Storage.`);
      }
      console.error("[Avatar] Storage upload error", {
        bucket: AVATAR_BUCKET,
        path: filePath,
        error: uploadError,
      });
      return errorResult("Gagal mengunggah file. Silakan coba lagi.");
    }

    console.log("[Avatar] upload success", {
      bucket: AVATAR_BUCKET,
      path: filePath,
    });

    const { data: publicUrlData } = adminDb.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData?.publicUrl ?? "";

    const { error: updateError } = await adminDb
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profileId);

    if (updateError) {
      console.error("[Avatar] Profile update error", {
        bucket: AVATAR_BUCKET,
        path: filePath,
        error: updateError,
      });
      return errorResult("Gagal memperbarui foto profil.");
    }

    console.log("[Avatar] upload success", {
      bucket: AVATAR_BUCKET,
      path: filePath,
      publicUrl: avatarUrl,
    });

    return successResult({ avatarUrl });
  } catch (err: any) {
    console.error("[Avatar] uploadProfileAvatarAction", err);
    return errorResult(err.message || "Gagal mengunggah foto profil.");
  }
}

export async function deleteProfileAvatarAction(
  brandSlug: string,
  profileId: string,
  currentAvatarUrl: string | null,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    const isOwnProfile = session.profileId === profileId;
    if (!isOwnProfile) {
      requireActionPermission(session.role, "user.manage");
    }

    const adminDb = createServiceRoleSupabaseClient() as any;

    if (currentAvatarUrl) {
      try {
        const url = new URL(currentAvatarUrl);
        const pathParts = url.pathname.split("/");
        const storageIndex = pathParts.indexOf(AVATAR_BUCKET);
        if (storageIndex !== -1) {
          const objectPath = pathParts.slice(storageIndex + 1).join("/");
          if (objectPath) {
            console.log("[Avatar] deleting", { bucket: AVATAR_BUCKET, objectPath });
            await adminDb.storage.from(AVATAR_BUCKET).remove([objectPath]);
          }
        }
      } catch (urlErr) {
        console.warn("[Avatar] could not parse old avatar URL for deletion", { currentAvatarUrl, error: urlErr });
      }
    }

    const { error } = await adminDb
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profileId);

    if (error) {
      return errorResult("Gagal menghapus foto profil.");
    }

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Avatar] deleteProfileAvatarAction", err);
    return errorResult(err.message || "Gagal menghapus foto profil.");
  }
}
