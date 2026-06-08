/**
 * Helper types for Supabase query results and RPC calls.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type { Database } from "@/types/database.types";
