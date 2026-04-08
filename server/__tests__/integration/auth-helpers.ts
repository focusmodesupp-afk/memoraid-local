/**
 * Auth helpers for integration tests.
 *
 * Uses the DEV_SKIP_AUTH bypass (header x-dev-bypass: 1) which returns
 * { id: 'dev-bypass', email: 'dev@local', role: 'super_admin' }.
 *
 * For RBAC tests, seed real admin_users + nexus_admin_roles rows.
 */

import type { Test } from 'supertest';

/** Attach dev-bypass auth header to a supertest request. */
export function asAdmin(request: Test): Test {
  return request.set('x-dev-bypass', '1');
}

/**
 * Create a real admin user row in the DB for RBAC testing.
 * Returns the admin user ID.
 */
export async function seedAdminUser(
  db: any,
  overrides: { email?: string; fullName?: string; role?: string } = {}
): Promise<string> {
  const { sql } = await import('drizzle-orm');
  const email = overrides.email ?? `test-admin-${Date.now()}@test.local`;
  const fullName = overrides.fullName ?? 'Test Admin';
  const role = overrides.role ?? 'super_admin';

  const result = await db.execute(
    sql`INSERT INTO admin_users (email, full_name, role, password_hash, created_at, updated_at)
        VALUES (${email}, ${fullName}, ${role}, 'not-a-real-hash', NOW(), NOW())
        RETURNING id`
  );
  return (result as any).rows[0].id;
}

/**
 * Grant a NEXUS role to an admin user.
 */
export async function grantNexusRole(
  db: any,
  adminUserId: string,
  role: string
): Promise<void> {
  const { sql } = await import('drizzle-orm');
  await db.execute(
    sql`INSERT INTO nexus_admin_roles (admin_user_id, role, granted_at)
        VALUES (${adminUserId}, ${role}, NOW())
        ON CONFLICT DO NOTHING`
  );
}
