/**
 * Permissions for familyMembers and familyInvites.
 * These values are stored in the permissions jsonb column.
 * @see shared/schemas/schema.ts – familyMembers, familyInvites
 */
export const PERMISSIONS = [
  'view_tasks',
  'edit_tasks',
  'view_patient',
  'edit_patient',
  'manage_members',
  'view_calendar',
  'edit_calendar',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * userRoleEnum: manager | caregiver | viewer | guest
 * @see shared/schemas/schema.ts – userRoleEnum
 */
export type UserRole = 'manager' | 'caregiver' | 'viewer' | 'guest';

/**
 * memberTier: family | supporter_friend | supporter_medical
 * @see shared/schemas/schema.ts – familyMembers.memberTier, familyInvites.memberTier
 */
export type MemberTier = 'family' | 'supporter_friend' | 'supporter_medical';
