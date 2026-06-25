import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sendEmail, emailTemplates } from '@/lib/email/service'
import { awardXp } from '@/lib/gamification/engine'
import { processReferralSignup } from '@/lib/referral'
import { assignRole, seedRolesAndPermissions } from '@/lib/rbac'

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  studyGoal: z.enum(['FAST', 'STEADY', 'EXAMS_ONLY']).optional(),
  examDate: z.string().optional(),
  referralCode: z.string().optional(),
  guestId: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.flatten() }, { status: 400 })
    }
    const { name, email, phone, password, studyGoal, examDate, referralCode, guestId } = parsed.data
    const lower = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: lower } })
    if (existing) {
      return NextResponse.json({ error: 'Dit e-mailadres is al geregistreerd.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email: lower,
        name,
        phone,
        passwordHash,
        role: 'STUDENT',
        country: 'NL',
        studyGoal: studyGoal ?? 'STEADY',
        examDate: examDate ? new Date(examDate) : null,
        emailVerified: new Date(),
      },
    })

    // Assign default STUDENT role (RBAC)
    await seedRolesAndPermissions().catch(() => {})
    await assignRole(user.id, 'STUDENT').catch(() => {})
    // Create default notification settings
    await prisma.notificationSetting.create({ data: { userId: user.id } }).catch(() => {})

    // Welcome XP
    await awardXp(user.id, 50, 'SIGNUP')

    // Welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Welkom bij LumaRijschool! 🎉',
        body: 'Begin met je eerste gratis les en verdien je eerste XP.',
        link: '/lessons',
      },
    })

    // Welcome email
    await sendEmail({ to: user.email, ...emailTemplates.welcome(name) })

    // Process referral if code provided
    if (referralCode) {
      await processReferralSignup({ referrerCode: referralCode, newUserId: user.id }).catch(() => {})
    }

    // Convert guest if guestId provided
    if (guestId) {
      await prisma.guest.update({
        where: { id: guestId },
        data: { userId: user.id, converted: true, convertedAt: new Date() },
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (e: any) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
