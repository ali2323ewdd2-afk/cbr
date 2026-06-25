/**
 * Referral system — codes, links, rewards, leaderboards.
 */
import { prisma } from '@/lib/prisma'
import { awardXp } from '@/lib/gamification/engine'

const REFERRAL_REWARDS = {
  FRIEND_JOINED: 50,    // referrer gets 50 XP when friend signs up
  FRIEND_SUBSCRIBED: 200, // 200 XP when friend takes any subscription
  FRIEND_7_DAY: 100,    // 100 XP after friend stays 7 days
  FRIEND_30_DAY: 300,   // 300 XP after friend stays 30 days
  FRIEND_FREE_DAYS: 7,  // referred user gets 7 days free Month access
}

export async function generateReferralLink(userId: string, baseUrl: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  return `${baseUrl}/register?ref=${user.referralCode}`
}

export async function processReferralSignup({
  referrerCode,
  newUserId,
}: {
  referrerCode: string
  newUserId: string
}) {
  const referrer = await prisma.user.findUnique({ where: { referralCode: referrerCode } })
  if (!referrer || referrer.id === newUserId) return null

  // Mark who referred the new user
  await prisma.user.update({
    where: { id: newUserId },
    data: { referredById: referrer.id },
  })

  // Create referral record
  const referral = await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredId: newUserId,
      code: referrerCode,
      convertedAt: new Date(),
      rewardGiven: true,
      rewardType: 'XP',
      rewardAmount: REFERRAL_REWARDS.FRIEND_JOINED,
    },
  })

  // Award referrer
  await awardXp(referrer.id, REFERRAL_REWARDS.FRIEND_JOINED, 'REFERRAL_FRIEND_JOINED', referral.id)
  await prisma.referralReward.create({
    data: {
      userId: referrer.id,
      type: 'XP',
      amount: REFERRAL_REWARDS.FRIEND_JOINED,
      reason: 'FRIEND_JOINED',
      referralId: referral.id,
    },
  })

  // Give the new user 7 days free Month access
  await grantTrialSubscription(newUserId, REFERRAL_REWARDS.FRIEND_FREE_DAYS)

  // Notification to referrer
  await prisma.notification.create({
    data: {
      userId: referrer.id,
      type: 'REFERRAL',
      title: 'Nieuwe referral! 🎉',
      body: `Een vriend heeft zich aangemeld met jouw code. +${REFERRAL_REWARDS.FRIEND_JOINED} XP verdiend!`,
      link: '/profile',
    },
  })

  return referral
}

export async function processReferralSubscription(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.referredById) return

  const referral = await prisma.referral.findUnique({
    where: { referredId: userId },
  })
  if (!referral || !referral.convertedAt) return

  // Already rewarded for subscription?
  const existing = await prisma.referralReward.findFirst({
    where: { referralId: referral.id, reason: 'FRIEND_SUBSCRIBED' },
  })
  if (existing) return

  await awardXp(referral.referrerId, REFERRAL_REWARDS.FRIEND_SUBSCRIBED, 'REFERRAL_FRIEND_SUBSCRIBED', referral.id)
  await prisma.referralReward.create({
    data: {
      userId: referral.referrerId,
      type: 'XP',
      amount: REFERRAL_REWARDS.FRIEND_SUBSCRIBED,
      reason: 'FRIEND_SUBSCRIBED',
      referralId: referral.id,
    },
  })

  await prisma.notification.create({
    data: {
      userId: referral.referrerId,
      type: 'REFERRAL',
      title: 'Je friend is geabonneerd! 💰',
      body: `Een vriend heeft een abonnement genomen. +${REFERRAL_REWARDS.FRIEND_SUBSCRIBED} XP verdiend!`,
      link: '/profile',
    },
  })
}

async function grantTrialSubscription(userId: string, days: number) {
  const plan = await prisma.plan.findUnique({ where: { slug: 'MONTH' } })
  if (!plan) return
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)
  await prisma.subscription.upsert({
    where: { userId },
    update: { planId: plan.id, status: 'ACTIVE', startedAt: new Date(), expiresAt },
    create: { userId, planId: plan.id, status: 'ACTIVE', startedAt: new Date(), expiresAt },
  })
}

export async function getReferralStats(userId: string) {
  const [totalReferrals, convertedReferrals, totalXp] = await Promise.all([
    prisma.referral.count({ where: { referrerId: userId } }),
    prisma.referral.count({ where: { referrerId: userId, convertedAt: { not: null } } }),
    prisma.referralReward.aggregate({ where: { userId }, _sum: { amount: true } }),
  ])
  return {
    totalReferrals,
    convertedReferrals,
    totalXpEarned: totalXp._sum.amount ?? 0,
    code: (await prisma.user.findUnique({ where: { id: userId } }))?.referralCode ?? '',
  }
}

export async function getReferralLeaderboard() {
  const top = await prisma.referral.groupBy({
    by: ['referrerId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  })
  const userIds = top.map((t) => t.referrerId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatarUrl: true },
  })
  return top.map((t, i) => ({
    rank: i + 1,
    userId: t.referrerId,
    name: users.find((u) => u.id === t.referrerId)?.name ?? 'Anoniem',
    avatarUrl: users.find((u) => u.id === t.referrerId)?.avatarUrl,
    referrals: t._count.id,
  }))
}
