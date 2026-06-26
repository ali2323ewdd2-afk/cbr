import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { is2FAEnabled, verify2FA } from '@/lib/security'

const authSecret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'luma-rij-school-dev-secret-2026')

export const authOptions: NextAuthOptions = {
  // No adapter — we manage users manually with credentials provider.
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'LumaRijschool',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Wachtwoord', type: 'password' },
        token: { label: '2FA code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.toLowerCase().trim()
        const user = await prisma.user.findUnique({
          where: { email },
          include: { subscription: true },
        })
        if (!user) return null
        if (user.banned) throw new Error('Je account is geblokkeerd.')
        const ok = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!ok) return null
        if (await is2FAEnabled(user.id)) {
          const token = (credentials as Record<string, string | undefined>).token
          if (!token) throw new Error('TWO_FACTOR_REQUIRED')
          const valid2FA = await verify2FA(user.id, token)
          if (!valid2FA) throw new Error('TWO_FACTOR_INVALID')
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  secret: authSecret,
}
