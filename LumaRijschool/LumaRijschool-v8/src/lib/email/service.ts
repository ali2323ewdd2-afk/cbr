/**
 * Email service — uses nodemailer with SMTP env vars.
 * Falls back to console.log when SMTP is not configured (dev mode).
 */
import nodemailer from 'nodemailer'

// Canonical public URL for links inside emails (falls back to the production domain).
const APP_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://lumatheorie.nl'

const transporter = (() => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return null
})()

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html?: string
  text?: string
}) {
  if (!transporter) {
    console.log(`📧 [email:dev-mode] to=${to} subject="${subject}"`)
    if (text) console.log(text)
    return { dev: true }
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'LumaRijschool <noreply@lumatheorie.nl>',
      to,
      subject,
      html,
      text,
    })
    return info
  } catch (e) {
    console.error('Email send failed:', e)
    return null
  }
}

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welkom bij LumaRijschool! 🎉',
    html: `
      <div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:24px;">
        <h1 style="color:#2563EB;">Welkom ${name}!</h1>
        <p>Je account is aangemaakt. Begin meteen met je eerste gratis lessen.</p>
        <a href="${APP_URL}/dashboard" style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Naar dashboard</a>
      </div>
    `,
    text: `Welkom ${name}! Je account is aangemaakt. Ga naar ${APP_URL}/dashboard om te beginnen.`,
  }),
  paymentConfirmation: (name: string, planName: string, amount: string, expiresAt: string) => ({
    subject: `Betaling bevestigd — ${planName} actief`,
    html: `
      <div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:24px;">
        <h1 style="color:#1FB871;">Bedankt voor je aankoop, ${name}!</h1>
        <p>Je <strong>${planName}</strong>-abonnement is actief tot <strong>${expiresAt}</strong>.</p>
        <p>Bedrag: <strong>${amount}</strong></p>
        <a href="${APP_URL}/dashboard" style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Start met leren</a>
      </div>
    `,
    text: `Betaling bevestigd. ${planName} actief tot ${expiresAt}.`,
  }),
  examResult: (name: string, score: number, passed: boolean) => ({
    subject: passed ? 'Geslaagd! 🎉' : 'Examen afgerond',
    html: `
      <div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:24px;">
        <h1 style="color:${passed ? '#1FB871' : '#FF6B6B'};">${passed ? 'Gefeliciteerd, ' + name + '!' : 'Blijf oefenen, ' + name}</h1>
        <p>Je score: <strong>${Math.round(score * 100)}%</strong></p>
        <p>${passed ? 'Je bent klaar voor het echte CBR-examen.' : 'Bekijk je fouten en probeer opnieuw.'}</p>
      </div>
    `,
    text: `Examenresultaat: ${Math.round(score * 100)}% — ${passed ? 'geslaagd' : 'niet geslaagd'}.`,
  }),
  streakWarning: (name: string, streak: number) => ({
    subject: `Je ${streak}-dagen streak staat op het spel! 🔥`,
    html: `<div style="font-family:system-ui;"><p>Hoi ${name},</p><p>Je bent al ${streak} dagen actief. Studeer vandaag om je streak te behouden!</p></div>`,
    text: `Hoi ${name}, je ${streak}-dagen streak staat op het spel. Studeer vandaag!`,
  }),
}
