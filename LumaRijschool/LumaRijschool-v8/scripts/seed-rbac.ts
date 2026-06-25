/**
 * RBAC Seed — Creates default roles and permissions.
 * Called by entrypoint.sh after the database schema is pushed.
 *
 * This delegates to the single source of truth in src/lib/rbac.ts so the roles,
 * permissions and the RolePermission join table always match the Prisma schema
 * (Role has slug/name/description/isSystem — NOT level/permissions[]).
 */
import { seedRolesAndPermissions } from '../src/lib/rbac'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('Seeding RBAC roles & permissions...')
  await seedRolesAndPermissions()
  console.log('RBAC seed complete')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error('RBAC seed error:', e instanceof Error ? e.message : e)
    await prisma.$disconnect()
    // Non-fatal: roles may already exist. Exit 0 so the entrypoint can continue to start the server.
    process.exit(0)
  })
