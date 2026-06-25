/**
 * Security: 2FA (TOTP), trusted devices, IP blocking, audit logs, login alerts.
 */
import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/service'

// ─── 2FA setup ──────────────────────────────────────────
export async function generate2FASecret(userId: string, email: string) {
  const secret = generateSecret()
  const otpauth = generateURI({ secret, label: email, issuer: 'LumaRijschool' })
  const qrDataUrl = await QRCode.toDataURL(otpauth)

  // Store (not yet enabled)
  await prisma.twoFactorSecret.upsert({
    where: { userId },
    update: { secret },
    create: { userId, secret, backupCodes: JSON.stringify([]) },
  })

  return { secret, qrDataUrl, otpauth }
}

export async function verify2FA(userId: string, token: string): Promise<boolean> {
  const record = await prisma.twoFactorSecret.findUnique({ where: { userId } })
  if (!record) return false
  const result = await verify({ token, secret: record.secret })
  // otplib v13 returns VerifyResult which has a `valid` property or is boolean-like
  if (typeof result === 'boolean') return result
  if (result && typeof result === 'object' && 'valid' in result) return (result as any).valid === true
  return Boolean(result)
}

export async function enable2FA(userId: string, token: string): Promise<boolean> {
  const valid = await verify2FA(userId, token)
  if (!valid) return false
  await prisma.twoFactorSecret.update({
    where: { userId },
    data: { enabled: true, enabledAt: new Date() },
  })
  await prisma.auditLog.create({
    data: { actorId: userId, action: '2FA_ENABLED', entity: 'User', entityId: userId },
  })
  return true
}

export async function disable2FA(userId: string): Promise<void> {
  await prisma.twoFactorSecret.updateMany({
    where: { userId },
    data: { enabled: false, enabledAt: null },
  })
  await prisma.auditLog.create({
    data: { actorId: userId, action: '2FA_DISABLED', entity: 'User', entityId: userId },
  })
}

export async function is2FAEnabled(userId: string): Promise<boolean> {
  const record = await prisma.twoFactorSecret.findUnique({ where: { userId } })
  return !!record?.enabled
}

// ─── Trusted devices ────────────────────────────────────
export async function addTrustedDevice(userId: string, fingerprint: string, userAgent: string, ip: string) {
  await prisma.trustedDevice.upsert({
    where: { userId_deviceFingerprint: { userId, deviceFingerprint: fingerprint } },
    update: { lastSeen: new Date(), ip, userAgent },
    create: { userId, deviceFingerprint: fingerprint, userAgent, ip },
  })
}

export async function isTrustedDevice(userId: string, fingerprint: string): Promise<boolean> {
  const device = await prisma.trustedDevice.findUnique({
    where: { userId_deviceFingerprint: { userId, deviceFingerprint: fingerprint } },
  })
  return !!device
}

// ─── IP blocking ────────────────────────────────────────
export async function blockIp(ip: string, reason: string, blockedBy?: string, expiresAt?: Date) {
  return prisma.ipBlock.upsert({
    where: { ip },
    update: { reason, blockedBy, expiresAt },
    create: { ip, reason, blockedBy, expiresAt },
  })
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const block = await prisma.ipBlock.findUnique({ where: { ip } })
  if (!block) return false
  if (block.expiresAt && block.expiresAt < new Date()) {
    await prisma.ipBlock.delete({ where: { ip } })
    return false
  }
  return true
}

// ─── Audit log ──────────────────────────────────────────
export async function audit({
  actorId,
  action,
  entity,
  entityId,
  metadata,
  ip,
}: {
  actorId?: string
  action: string
  entity: string
  entityId?: string
  metadata?: string
  ip?: string
}) {
  return prisma.auditLog.create({
    data: { actorId, action, entity, entityId, metadata, ip },
  })
}

// ─── Login alert (email user on new device) ─────────────
export async function sendLoginAlert({
  email,
  name,
  ip,
  device,
  location,
  isTrusted,
}: {
  email: string
  name?: string
  ip: string
  device: string
  location?: string
  isTrusted: boolean
}) {
  if (isTrusted) return // skip alert for trusted devices
  const subject = 'Nieuwe inlog op je LumaRijschool account'
  const html = `
    <div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#0B1B3B;">Nieuwe inlog gedetecteerd</h2>
      <p>Hoi ${name ?? 'student'},</p>
      <p>We hebben een nieuwe inlog op je account gedetecteerd:</p>
      <ul>
        <li><strong>IP:</strong> ${ip}</li>
        <li><strong>Apparaat:</strong> ${device}</li>
        ${location ? `<li><strong>Locatie:</strong> ${location}</li>` : ''}
        <li><strong>Tijdstip:</strong> ${new Date().toLocaleString('nl-NL')}</li>
      </ul>
      <p>Was jij dit? Dan kun je dit bericht negeren. Was dit niet jij? Log direct in en wijzig je wachtwoord.</p>
      <a href="${process.env.NEXTAUTH_URL || 'https://lumatheorie.nl'}/profile" style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Naar profiel</a>
    </div>
  `
  await sendEmail({ to: email, subject, html })
}

// ─── Generate device fingerprint from request ───────────
export function getDeviceFingerprint(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim()
  const ua = req.headers.get('user-agent') ?? ''
  return `${ip}::${ua.slice(0, 100)}`
}

export function getDeviceLabel(req: Request): string {
  const ua = req.headers.get('user-agent') ?? ''
  const browser = /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Linux'
  return `${browser} · ${os}`
}
