/**
 * RBAC Seed — Creates default roles and permissions.
 * Called by entrypoint.sh after database schema is pushed.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_ROLES = [
  {
    name: 'STUDENT',
    level: 1,
    permissions: [
      'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
      'profile.edit', 'support.create', 'referral.use', 'mysterybox.open',
      'challenges.view', 'certificates.view.own', 'search.use', 'faq.view',
      'ratings.create', 'comments.create',
    ],
  },
  {
    name: 'MODERATOR',
    level: 2,
    permissions: [
      'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
      'profile.edit', 'support.create', 'referral.use', 'mysterybox.open',
      'challenges.view', 'certificates.view.own', 'search.use', 'faq.view',
      'ratings.create', 'comments.create',
      'comments.moderate', 'comments.hide', 'users.view.limited',
      'support.view', 'support.reply',
    ],
  },
  {
    name: 'TEACHER',
    level: 3,
    permissions: [
      'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
      'profile.edit', 'support.create', 'referral.use', 'mysterybox.open',
      'challenges.view', 'certificates.view.own', 'search.use', 'faq.view',
      'ratings.create', 'comments.create',
      'lessons.create', 'lessons.edit', 'lessons.delete',
      'questions.create', 'questions.edit', 'questions.delete',
      'exams.create', 'exams.edit', 'exams.delete',
      'analytics.view.lessons', 'analytics.view.exams',
      'support.view', 'support.reply',
    ],
  },
  {
    name: 'SUPPORT',
    level: 4,
    permissions: [
      'lessons.view', 'exams.take', 'tutor.use', 'planner.use',
      'profile.edit', 'support.create', 'referral.use', 'search.use', 'faq.view',
      'users.view', 'users.edit', 'support.view', 'support.reply', 'analytics.view',
    ],
  },
  {
    name: 'ADMIN',
    level: 5,
    permissions: ['*'],
  },
  {
    name: 'SUPER_ADMIN',
    level: 6,
    permissions: ['*'],
  },
]

async function main() {
  console.log('Seeding RBAC roles & permissions...')
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name, level: role.level, permissions: role.permissions },
    })
    console.log(`  ✓ Role: ${role.name}`)
  }
  console.log('RBAC seed complete')
}

main()
  .catch((e) => {
    console.error('RBAC seed error:', e.message)
    process.exit(0)
  })
  .finally(() => prisma.$disconnect())