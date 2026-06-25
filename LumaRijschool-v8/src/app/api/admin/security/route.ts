import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { blockIp } from '@/lib/security'
import { forbiddenResponse, readJson, requireAdminOnlySession, requireAdminSession, serverErrorResponse } from '@/lib/admin-api'

const actionSchema = z.object({
  action: z.enum(['BLOCK_IP', 'UNBLOCK_IP', 'REVOKE_DEVICE']),
  ip: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(1).max(1000).optional(),
  deviceId: z.string().trim().min(1).optional(),
})

export async function GET() {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const [ipBlocks, devices, auditLogs, antiCheatLogs] = await Promise.all([
      prisma.ipBlock.findMany({ orderBy: { blockedAt: 'desc' }, take: 100 }),
      prisma.trustedDevice.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { lastSeen: 'desc' },
        take: 100,
      }),
      prisma.auditLog.findMany({
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.antiCheatLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])
    const antiCheatUserIds = Array.from(new Set(antiCheatLogs.map((log) => log.userId)))
    const users = await prisma.user.findMany({
      where: { id: { in: antiCheatUserIds } },
      select: { id: true, name: true, email: true },
    })
    const userMap = new Map(users.map((user) => [user.id, user]))
    return NextResponse.json({
      ipBlocks,
      devices,
      auditLogs,
      antiCheatLogs: antiCheatLogs.map((log) => ({ ...log, user: userMap.get(log.userId) ?? null })),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, actionSchema)
  if (parsed.error) return parsed.error

  try {
    if (parsed.data.action === 'BLOCK_IP') {
      if (!parsed.data.ip || !parsed.data.reason) {
        return NextResponse.json({ error: 'IP and reason are required' }, { status: 400 })
      }
      await blockIp(parsed.data.ip, parsed.data.reason, session.user.id)
      return NextResponse.json({ ok: true })
    }
    if (parsed.data.action === 'UNBLOCK_IP') {
      if (!parsed.data.ip) return NextResponse.json({ error: 'IP is required' }, { status: 400 })
      await prisma.ipBlock.delete({ where: { ip: parsed.data.ip } })
      return NextResponse.json({ ok: true })
    }
    if (parsed.data.action === 'REVOKE_DEVICE') {
      if (!parsed.data.deviceId) return NextResponse.json({ error: 'Device id is required' }, { status: 400 })
      await prisma.trustedDevice.delete({ where: { id: parsed.data.deviceId } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
