/**
 * Create a PLATFORM_OWNER account for accessing the platform panel.
 *
 * Usage: npx tsx scripts/create-platform-owner.ts
 *
 * This script:
 * 1. Creates a Supabase Auth user (with password)
 * 2. Creates or reuses a profile
 * 3. Creates user_brand_membership with PLATFORM_OWNER role (brand_id = NULL)
 * 4. Links the auth user to the profile
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "admin@seervis.io";
const PASSWORD = "Admin123!";
const NAME = "Platform Admin";

async function main() {
  console.log(`Creating PLATFORM_OWNER account: ${EMAIL}`);

  // Step 1: Check if profile already exists by email
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, auth_user_id")
    .eq("email", EMAIL)
    .maybeSingle();

  let profileId: string;

  if (existingProfile) {
    console.log(`Profile already exists: ${existingProfile.id}`);
    profileId = existingProfile.id;

    if (existingProfile.auth_user_id) {
      console.log("Auth user already linked. Checking if membership exists...");
    }
  } else {
    // Step 2: Create profile
    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({ name: NAME, email: EMAIL, is_active: true })
      .select("id")
      .maybeSingle();

    if (profileError || !newProfile) {
      console.error("Failed to create profile:", profileError);
      process.exit(1);
    }

    profileId = newProfile.id;
    console.log(`Profile created: ${profileId}`);
  }

  // Step 3: Create membership (PLATFORM_OWNER, brand_id = NULL)
  const { data: existingMembership } = await supabase
    .from("user_brand_memberships")
    .select("id")
    .eq("profile_id", profileId)
    .is("brand_id", null)
    .eq("role", "PLATFORM_OWNER")
    .maybeSingle();

  if (!existingMembership) {
    const { error: memberError } = await supabase
      .from("user_brand_memberships")
      .insert({
        profile_id: profileId,
        brand_id: null,
        role: "PLATFORM_OWNER",
        is_active: true,
      });

    if (memberError) {
      console.error("Failed to create membership:", memberError);
      process.exit(1);
    }
    console.log("PLATFORM_OWNER membership created.");
  } else {
    console.log("PLATFORM_OWNER membership already exists.");
  }

  // Step 4: Create auth user with password (if not already linked)
  const { data: profile } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("id", profileId)
    .maybeSingle();

  if (profile?.auth_user_id) {
    console.log(`Auth user already linked: ${profile.auth_user_id}`);
    console.log("");
    console.log("Account ready!");
    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log("  URL:      http://localhost:3000/platform/dashboard");
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME, auth_created_by_admin: true },
  });

  if (authError) {
    console.error("Failed to create auth user:", authError);
    process.exit(1);
  }

  const authUserId = authData.user.id;
  console.log(`Auth user created: ${authUserId}`);

  // Step 5: Link auth user to profile
  const { error: linkError } = await supabase
    .from("profiles")
    .update({ auth_user_id: authUserId })
    .eq("id", profileId);

  if (linkError) {
    console.error("Failed to link auth user:", linkError);
    process.exit(1);
  }

  console.log("Auth user linked to profile successfully.");
  console.log("");
  console.log("=== ACCOUNT READY ===");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Role:     PLATFORM_OWNER`);
  console.log(`  URL:      http://localhost:3000/platform/dashboard`);
  console.log("=====================");
}

main().catch(console.error);
