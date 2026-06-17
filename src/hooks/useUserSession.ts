// src/hooks/useUserSession.ts

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UserSessionHookResult {
  user: User | null;
  role: string;
  loading: boolean;
}

export function useUserSession(): UserSessionHookResult {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      // Get auth user
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) {
        setUser(null);
        setRole("");
        setLoading(false);
        return;
      }
      setUser(authUser);

      // Load profile to get profile id
      const { data: profile, error: profErr } = await supabase
        .from("profiles" as any)
        .select("id")
        .eq("auth_user_id", authUser.id)
        .single();
      if (profErr || !profile) {
        setRole("");
        setLoading(false);
        return;
      }

      // Fetch first brand membership for role
      const { data: membership, error: memErr } = await supabase
        .from("user_brand_memberships" as any)
        .select("role")
        .eq("profile_id", (profile as { id: string }).id)
        .order("is_active", { ascending: false })
        .limit(1)
        .single();
      if (!memErr && membership && (membership as any).role) {
        setRole((membership as any).role);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return { user, role, loading };
}

export default useUserSession;
