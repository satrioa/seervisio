/**
 * Role types — canonical source.
 * Re-exports from @/lib/permissions/roles for centralized access.
 */
export type { Role } from "@/lib/permissions/roles";
export {
  ROLES,
  ROLE_LABELS,
  ROLE_HIERARCHY,
  isRoleAtLeast,
} from "@/lib/permissions/roles";
