/**
 * RBAC — Role-Based Access Control
 * Super Admin | Admin | Support | Teacher | Moderator | Student | Guest
 * Each role has a defined set of permissions.
 */
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis'

// ─── Role hierarchy (higher = more powerful) ───────────
export const ROLE_HIERARCHY: Record<string, number> = {
  GUEST: 0,
  STUDENT: 1,
  MODERATOR: 2,
  TEACHER: 3,
  SUPPORT: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
}

// ─── Default permission matrix per role ────────────────
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  GUEST: ['lessons.view.free', 'exams.take.free', 'search.use', 'faq.view'],
  STUDENT: [
    'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
    'profile.edit', 'support.create', 'referral.use', 'mysterybox.open',
    'challenges.view', 'certificates.view.own', 'search.use', 'faq.view',
    'ratings.create', 'comments.create',
  ],
  MODERATOR: [
    'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
    'profile.edit', 'support.create', 'referral.use', 'mysterybox.open',
    'challenges.view', 'certificates.view.own', 'search.use', 'faq.view',
    'ratings.create', 'comments.create',
    // moderator powers
    'comments.moderate', 'comments.hide', 'users.view.limited',
    'support.view', 'support.reply',
  ],
  TEACHER: [
    'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
    'profile.edit', 'support.create', 'referral.use', 'mysterybox.open',
    'challenges.view', 'certificates.view.own', 'search.use', 'faq.view',
    'ratings.create', 'comments.create',
    // teacher powers
    'lessons.create', 'lessons.edit', 'lessons.delete',
    'questions.create', 'questions.edit', 'questions.delete',
    'exams.create', 'exams.edit', 'exams.delete',
    'analytics.view.lessons', 'analytics.view.exams',
    'support.view', 'support.reply',
  ],
  SUPPORT: [
    'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
    'profile.edit', 'support.create', 'referral.use', 'mysterybox.open',
    'challenges.view', 'certificates.view.own', 'search.use', 'faq.view',
    'ratings.create', 'comments.create',
    // support powers
    'users.view', 'users.extend.sub', 'users.ban', 'users.unban',
    'support.view', 'support.reply', 'support.resolve',
    'payments.view', 'payments.refund', 'invoices.view',
    'announcements.create', 'announcements.delete',
    'audit.view',
  ],
  ADMIN: [
    // everything
    '*', // wildcard = all permissions
  ],
  SUPER_ADMIN: ['*'],
}

export async function seedRolesAndPermissions() {
  // Seed permissions catalog
  const allPerms = new Set<string>()
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) allPerms.add(p)
  }
  for (const slug of allPerms) {
    const category = slug.split('.')[0].toUpperCase()
    await prisma.permission.upsert({
      where: { slug },
      update: {},
      create: { slug, name: slug, category },
    })
  }

  // Seed roles
  for (const [slug, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: slug.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
        description: `System role: ${slug}`,
        isSystem: true,
      },
    })
    // Assign permissions
    if (perms.includes('*')) {
      // Super admin / admin gets all
      const allPermsDb = await prisma.permission.findMany()
      for (const p of allPermsDb) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        })
      }
    } else {
      for (const slug2 of perms) {
        const p = await prisma.permission.findUnique({ where: { slug: slug2 } })
        if (p) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
            update: {},
            create: { roleId: role.id, permissionId: p.id },
          })
        }
      }
    }
  }
}

// ─── Get user's effective permissions (cached) ─────────
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const cacheKey = `user:${userId}:permissions`
  const cached = await cacheGet<string[]>(cacheKey)
  if (cached) return new Set(cached)

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  })

  const perms = new Set<string>()
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      perms.add(rp.permission.slug)
    }
  }

  // Check wildcard (admin/super_admin)
  const hasWildcard = userRoles.some((ur) => ROLE_PERMISSIONS[ur.role.slug]?.includes('*'))
  if (hasWildcard) {
    const all = await prisma.permission.findMany()
    for (const p of all) perms.add(p.slug)
  }

  await cacheSet(cacheKey, Array.from(perms), 300)
  return perms
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  if (perms.has('*')) return true
  return perms.has(permission)
}

export async function assignRole(userId: string, roleSlug: string, assignedBy?: string) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } })
  if (!role) throw new Error(`Role ${roleSlug} not found`)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id, assignedBy },
  })
  await cacheDel(`user:${userId}:permissions`)
}

export async function revokeRole(userId: string, roleSlug: string) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } })
  if (!role) return
  await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } })
  await cacheDel(`user:${userId}:permissions`)
}

// ─── Get user's highest role (for UI display) ───────────
export async function getUserHighestRole(userId: string): Promise<string> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })
  if (userRoles.length === 0) return 'STUDENT' // default
  return userRoles.reduce((highest, ur) => {
    const h = ROLE_HIERARCHY[highest] ?? 0
    const c = ROLE_HIERARCHY[ur.role.slug] ?? 0
    return c > h ? ur.role.slug : highest
  }, 'STUDENT')
}
