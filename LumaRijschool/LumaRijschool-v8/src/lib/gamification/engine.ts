/**
 * LumaRijschool — Full Gamification Engine
 * XP, levels, ranks (Bronze→Legend), streaks, badges, achievements,
 * mystery boxes, daily rewards, season pass, challenges.
 */
import { prisma } from '@/lib/prisma'
import { cacheSet, cacheDel, cacheInvalidatePattern, publish } from '@/lib/redis'

// ─── Level curve (quadratic) ────────────────────────────
export function levelFromXp(totalXp: number): { level: number; xpIntoLevel: number; xpForNext: number; progress: number } {
  let level = 1
  let required = 0
  while (level < 99) {
    const next = requiredForLevel(level + 1)
    if (totalXp < next) break
    required = next
    level++
  }
  const xpIntoLevel = totalXp - required
  const xpForNext = requiredForLevel(level + 1) - required
  const progress = xpForNext > 0 ? xpIntoLevel / xpForNext : 0
  return { level, xpIntoLevel, xpForNext, progress }
}

function requiredForLevel(level: number): number {
  if (level <= 1) return 0
  return 200 * (level - 1) + 50 * (level - 1) * (level - 2)
}

// ─── Rank from XP (Bronze → Legend) ─────────────────────
export const RANKS = [
  { tier: 'BRONZE', name: 'Bronze', minXp: 0, color: '#CD7F32', iconKey: '🥉', perks: '5% XP boost' },
  { tier: 'SILVER', name: 'Silver', minXp: 1000, color: '#C0C0C0', iconKey: '🥈', perks: '10% XP boost + 1 mystery box/week' },
  { tier: 'GOLD', name: 'Gold', minXp: 3000, color: '#FFD700', iconKey: '🥇', perks: '15% XP boost + daily reward access' },
  { tier: 'PLATINUM', name: 'Platinum', minXp: 7000, color: '#E5E4E2', iconKey: '💎', perks: '20% XP boost + exclusive badges' },
  { tier: 'DIAMOND', name: 'Diamond', minXp: 15000, color: '#B9F2FF', iconKey: '💠', perks: '25% XP boost + season pass' },
  { tier: 'MASTER', name: 'Master', minXp: 30000, color: '#7C5CFC', iconKey: '👑', perks: '30% XP boost + priority support' },
  { tier: 'LEGEND', name: 'Legend', minXp: 60000, color: '#FF6B6B', iconKey: '🏆', perks: '35% XP boost + lifetime perks' },
] as const

export function rankFromXp(totalXp: number) {
  let rank: typeof RANKS[number] = RANKS[0]
  for (const r of RANKS) {
    if (totalXp >= r.minXp) rank = r
  }
  const nextRank = RANKS.find((r) => r.minXp > totalXp)
  return {
    tier: rank.tier,
    name: rank.name,
    minXp: rank.minXp,
    color: rank.color,
    iconKey: rank.iconKey,
    perks: rank.perks,
    nextRank: nextRank ? { tier: nextRank.tier, minXp: nextRank.minXp, xpNeeded: nextRank.minXp - totalXp } : null,
  }
}

export function xpBoostForRank(rankTier: string): number {
  const boosts: Record<string, number> = {
    BRONZE: 0.05, SILVER: 0.10, GOLD: 0.15, PLATINUM: 0.20,
    DIAMOND: 0.25, MASTER: 0.30, LEGEND: 0.35,
  }
  return boosts[rankTier] ?? 0
}

// ─── XP Awarding (with rank boost) ──────────────────────
export async function awardXp(userId: string, amount: number, reason: string, refId?: string) {
  if (amount <= 0) return null
  // Apply rank boost
  const totalXp = await getTotalXp(userId)
  const { tier } = rankFromXp(totalXp)
  const boost = xpBoostForRank(tier)
  const boostedAmount = Math.round(amount * (1 + boost))

  const event = await prisma.xPEvent.create({
    data: { userId, amount: boostedAmount, reason, refId },
  })

  // Invalidate caches
  await cacheDel(`user:${userId}:xp`)
  await cacheDel(`user:${userId}:gamification`)
  await cacheDel(`dashboard:${userId}`)

  // Check achievements
  await checkXpAchievements(userId)
  // Streak check
  await updateStreak(userId)
  // Challenge progress
  await updateChallengeProgress(userId, 'XP', boostedAmount)

  // Notification on milestone
  if (reason === 'PERFECT_SCORE' || reason === 'EXAM_PASS') {
    await prisma.notification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT',
        title: `+${boostedAmount} XP verdiend 🎉`,
        body: reason === 'PERFECT_SCORE' ? 'Perfecte score op je examen!' : 'Examen geslaagd!',
        link: '/dashboard',
      },
    })
    // Real-time push
    await publish('notifications:user', { userId, type: 'XP', amount: boostedAmount, reason })
  }

  // Check for level-up
  const newTotalXp = totalXp + boostedAmount
  const oldLevel = levelFromXp(totalXp).level
  const newLevel = levelFromXp(newTotalXp).level
  if (newLevel > oldLevel) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT',
        title: `Level Up! Je bent nu Level ${newLevel} 🎉`,
        body: 'Blijf zo doorgaan, je maakt geweldige voortgang!',
        link: '/dashboard',
      },
    })
    await publish('notifications:user', { userId, type: 'LEVEL_UP', level: newLevel })
  }

  // Check for rank-up
  const oldRank = rankFromXp(totalXp)
  const newRank = rankFromXp(newTotalXp)
  if (newRank.tier !== oldRank.tier) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT',
        title: `Nieuwe rank: ${newRank.name} ${newRank.iconKey}`,
        body: `Gefeliciteerd! Je bent gepromoveerd naar ${newRank.name}. Perk: ${newRank.perks}`,
        link: '/profile',
      },
    })
    await publish('notifications:user', { userId, type: 'RANK_UP', rank: newRank })
  }

  return event
}

// ─── Streak ─────────────────────────────────────────────
export async function updateStreak(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = await prisma.streak.findUnique({ where: { userId } })
  if (!streak) {
    streak = await prisma.streak.create({ data: { userId, current: 1, longest: 1, lastActiveAt: new Date() } })
    await checkStreakMilestones(userId, 1)
    return streak
  }

  if (!streak.lastActiveAt) {
    const updated = await prisma.streak.update({
      where: { userId },
      data: { current: 1, longest: Math.max(streak.longest, 1), lastActiveAt: new Date() },
    })
    await checkStreakMilestones(userId, 1)
    return updated
  }

  const last = new Date(streak.lastActiveAt)
  last.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000)

  let newCurrent: number
  if (diffDays === 0) {
    return streak
  } else if (diffDays === 1) {
    newCurrent = streak.current + 1
  } else {
    newCurrent = 1
  }

  const updated = await prisma.streak.update({
    where: { userId },
    data: {
      current: newCurrent,
      longest: Math.max(streak.longest, newCurrent),
      lastActiveAt: new Date(),
    },
  })

  await checkStreakMilestones(userId, newCurrent)
  await updateChallengeProgress(userId, 'STREAK', newCurrent)
  return updated
}

// ─── Daily Rewards (7-day cycle) ────────────────────────
export async function claimDailyReward(userId: string): Promise<{ claimed: boolean; dayNumber: number; xp: number; message: string }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastClaim = await prisma.dailyRewardClaim.findFirst({
    where: { userId },
    orderBy: { claimedAt: 'desc' },
  })

  if (lastClaim) {
    const lastDate = new Date(lastClaim.claimedAt)
    lastDate.setHours(0, 0, 0, 0)
    const diffDays = Math.round((today.getTime() - lastDate.getTime()) / 86400000)
    if (diffDays === 0) {
      return { claimed: false, dayNumber: lastClaim.dayNumber, xp: 0, message: 'Al geclaimed vandaag.' }
    }
  }

  // Determine day number (1-7 cycle)
  const dayNumber = lastClaim && lastClaim.dayNumber < 7 ? lastClaim.dayNumber + 1 : 1
  const xpReward = [25, 50, 75, 100, 150, 200, 500][dayNumber - 1]

  await prisma.dailyRewardClaim.create({
    data: { userId, dayNumber, xpReward },
  })
  await awardXp(userId, xpReward, 'DAILY_REWARD')

  await publish('notifications:user', {
    userId, type: 'DAILY_REWARD', dayNumber, xp: xpReward,
  })

  return {
    claimed: true,
    dayNumber,
    xp: xpReward,
    message: `Dag ${dayNumber} beloning geclaimd: +${xpReward} XP!`,
  }
}

// ─── Badge checks ───────────────────────────────────────
export async function checkStreakMilestones(userId: string, currentStreak: number) {
  const badges = await prisma.badge.findMany()
  for (const badge of badges) {
    try {
      const req = JSON.parse(badge.requirement)
      if (req.metric === 'STREAK' && currentStreak >= req.goal) {
        await awardBadge(userId, badge.id)
      }
    } catch {}
  }
  const achievements = await prisma.achievement.findMany({ where: { metric: 'STREAK' } })
  for (const a of achievements) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: a.id } },
      update: { progress: currentStreak, completed: currentStreak >= a.goalValue, unlockedAt: currentStreak >= a.goalValue ? new Date() : null },
      create: { userId, achievementId: a.id, progress: currentStreak, completed: currentStreak >= a.goalValue, unlockedAt: currentStreak >= a.goalValue ? new Date() : null },
    })
  }
}

// ─── Award a badge (idempotent) ─────────────────────────
export async function awardBadge(userId: string, badgeId: string) {
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId } },
  })
  if (existing) return existing

  const badge = await prisma.badge.findUnique({ where: { id: badgeId } })
  if (!badge) return null

  const userBadge = await prisma.userBadge.create({ data: { userId, badgeId } })
  if (badge.xpReward > 0) await awardXp(userId, badge.xpReward, 'BADGE', badge.id)

  await prisma.notification.create({
    data: {
      userId, type: 'BADGE',
      title: `Nieuwe badge: ${badge.name} ${badge.iconKey}`,
      body: badge.description,
      link: '/dashboard',
    },
  })
  await publish('notifications:user', { userId, type: 'BADGE', badge })

  return userBadge
}

// ─── Check XP-based achievements ────────────────────────
export async function checkXpAchievements(userId: string) {
  const totalXp = await getTotalXp(userId)
  const achievements = await prisma.achievement.findMany({ where: { metric: 'XP' } })
  for (const a of achievements) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: a.id } },
      update: { progress: totalXp, completed: totalXp >= a.goalValue, unlockedAt: totalXp >= a.goalValue ? new Date() : null },
      create: { userId, achievementId: a.id, progress: totalXp, completed: totalXp >= a.goalValue, unlockedAt: totalXp >= a.goalValue ? new Date() : null },
    })
  }
}

// ─── Check lessons & exams & perfects ───────────────────
export async function checkProgressAchievements(userId: string) {
  const lessonsDone = await prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED' } })
  const examsDone = await prisma.examAttempt.count({ where: { userId, status: 'COMPLETED' } })
  const perfects = await prisma.examAttempt.count({ where: { userId, status: 'COMPLETED', correctCount: { gte: 40 } } })

  for (const [metric, value] of Object.entries({ LESSONS: lessonsDone, EXAMS: examsDone, PERFECTS: perfects })) {
    const achievements = await prisma.achievement.findMany({ where: { metric } })
    for (const a of achievements) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: a.id } },
        update: { progress: value, completed: value >= a.goalValue, unlockedAt: value >= a.goalValue ? new Date() : null },
        create: { userId, achievementId: a.id, progress: value, completed: value >= a.goalValue, unlockedAt: value >= a.goalValue ? new Date() : null },
      })
    }
    const badges = await prisma.badge.findMany()
    for (const b of badges) {
      try {
        const req = JSON.parse(b.requirement)
        if (req.metric === metric && value >= req.goal) await awardBadge(userId, b.id)
        if (req.metric === 'PERFECT_EXAM' && perfects >= req.goal) await awardBadge(userId, b.id)
      } catch {}
    }
  }

  await updateChallengeProgress(userId, 'LESSONS', lessonsDone)
  await updateChallengeProgress(userId, 'EXAMS', examsDone)
  await updateChallengeProgress(userId, 'PERFECTS', perfects)

  const examBadges = await prisma.badge.findMany({ where: { slug: { in: ['FIRST_EXAM', 'TEN_EXAMS'] } } })
  for (const b of examBadges) {
    try {
      const req = JSON.parse(b.requirement)
      if (req.metric === 'EXAMS' && examsDone >= req.goal) await awardBadge(userId, b.id)
    } catch {}
  }
}

// ─── Total XP (cached) ──────────────────────────────────
export async function getTotalXp(userId: string): Promise<number> {
  const cacheKey = `user:${userId}:xp`
  const { cacheGet } = await import('@/lib/redis')
  const cached = await cacheGet<number>(cacheKey)
  if (cached !== null) return cached
  const result = await prisma.xPEvent.aggregate({ where: { userId }, _sum: { amount: true } })
  const total = result._sum.amount ?? 0
  await cacheSet(cacheKey, total, 300)
  return total
}

// ─── Category score ─────────────────────────────────────
export async function updateCategoryScore(userId: string, topicId: string, isCorrect: boolean) {
  const existing = await prisma.categoryScore.findUnique({
    where: { userId_topicId: { userId, topicId } },
  })
  if (existing) {
    return prisma.categoryScore.update({
      where: { id: existing.id },
      data: {
        correct: existing.correct + (isCorrect ? 1 : 0),
        total: existing.total + 1,
      },
    })
  }
  return prisma.categoryScore.create({
    data: { userId, topicId, correct: isCorrect ? 1 : 0, total: 1 },
  })
}

// ─── Exam readiness calculation ─────────────────────────
export async function calculateReadiness(userId: string): Promise<number> {
  const recentAttempts = await prisma.examAttempt.findMany({
    where: { userId, status: 'COMPLETED' },
    orderBy: { finishedAt: 'desc' },
    take: 5,
  })
  if (recentAttempts.length === 0) return 0

  const avgScore = recentAttempts.reduce((sum, a) => sum + a.score, 0) / recentAttempts.length
  const lessonsDone = await prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED' } })
  const lessonFactor = Math.min(1, lessonsDone / 12)

  const readiness = Math.round((avgScore * 0.7 + lessonFactor * 0.3) * 100)
  return Math.min(100, readiness)
}

// ─── Mystery Box opening ────────────────────────────────
export async function openMysteryBox(userId: string, boxId: string): Promise<{ reward: { type: string; amount: number; meta?: string }; message: string }> {
  const box = await prisma.mysteryBox.findUnique({ where: { id: boxId } })
  if (!box || !box.isActive) throw new Error('Box not found')

  const totalXp = await getTotalXp(userId)
  if (totalXp < box.costXp) throw new Error('Niet genoeg XP')

  // Spend XP (negative event)
  await prisma.xPEvent.create({
    data: { userId, amount: -box.costXp, reason: 'MYSTERY_BOX_PURCHASE', refId: boxId },
  })
  await cacheDel(`user:${userId}:xp`)

  // Roll rewards
  const contents = JSON.parse(box.contents) as Array<{ type: string; amount?: number; slug?: string; chance: number }>
  let rolled: { type: string; amount?: number; slug?: string } | null = null
  const roll = Math.random()
  let cumulative = 0
  for (const c of contents) {
    cumulative += c.chance
    if (roll < cumulative) {
      rolled = c
      break
    }
  }
  if (!rolled) rolled = contents[0]

  // Apply reward
  let rewardMeta: string | undefined
  if (rolled.type === 'XP' && rolled.amount) {
    await prisma.xPEvent.create({ data: { userId, amount: rolled.amount, reason: 'MYSTERY_BOX_REWARD', refId: boxId } })
    await cacheDel(`user:${userId}:xp`)
  } else if (rolled.type === 'BADGE' && rolled.slug) {
    const badge = await prisma.badge.findUnique({ where: { slug: rolled.slug } })
    if (badge) {
      await awardBadge(userId, badge.id)
      rewardMeta = badge.name
    }
  } else if (rolled.type === 'STREAK_FREEZE') {
    const streak = await prisma.streak.findUnique({ where: { userId } })
    if (streak) {
      await prisma.streak.update({ where: { userId }, data: { current: streak.current + 1 } })
    }
    rewardMeta = 'Streak beschermer'
  }

  // Save record
  await prisma.userMysteryBox.create({
    data: {
      userId, boxId,
      rewardType: rolled.type,
      rewardAmount: rolled.amount ?? 0,
      rewardMeta,
    },
  })

  await publish('notifications:user', { userId, type: 'MYSTERY_BOX', reward: rolled })

  return {
    reward: { type: rolled.type, amount: rolled.amount ?? 0, meta: rewardMeta },
    message: rolled.type === 'XP' ? `+${rolled.amount} XP verdiend!` : rolled.type === 'BADGE' ? `Nieuwe badge: ${rewardMeta}!` : `${rewardMeta} verdiend!`,
  }
}

// ─── Challenges ─────────────────────────────────────────
export async function updateChallengeProgress(userId: string, metric: string, value: number) {
  const now = new Date()
  const activeChallenges = await prisma.challenge.findMany({
    where: {
      isActive: true,
      metric,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  })
  for (const c of activeChallenges) {
    const uc = await prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId, challengeId: c.id } },
      update: { progress: Math.max(value, 0) },
      create: { userId, challengeId: c.id, progress: value },
    })
    if (!uc.completed && uc.progress >= c.goalValue) {
      await prisma.userChallenge.update({
        where: { id: uc.id },
        data: { completed: true, claimedAt: new Date() },
      })
      await awardXp(userId, c.xpReward, 'CHALLENGE_COMPLETE', c.id)
      if (c.badgeSlug) {
        const badge = await prisma.badge.findUnique({ where: { slug: c.badgeSlug } })
        if (badge) await awardBadge(userId, badge.id)
      }
      await prisma.notification.create({
        data: {
          userId, type: 'ACHIEVEMENT',
          title: `Challenge voltooid: ${c.name} 🎯`,
          body: `+${c.xpReward} XP verdiend voor het voltooien van deze challenge!`,
          link: '/profile',
        },
      })
    }
  }
}

// ─── Active Season Pass ─────────────────────────────────
export async function getActiveSeasonPass() {
  const now = new Date()
  return prisma.seasonPass.findFirst({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
  })
}

export async function getUserSeasonPassProgress(userId: string) {
  const season = await getActiveSeasonPass()
  if (!season) return null
  return prisma.userSeasonPass.findFirst({
    where: { userId, seasonPassId: season.id },
  })
}
