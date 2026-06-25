'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface UserDetail {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  lastLoginAt: string | null
  lastLoginIp: string | null
  banned: boolean
  subscription: { status: string; expiresAt: string; plan: { name: string } } | null
  payments: { id: string; status: string; amountCents: number; currency: string; createdAt: string; plan: { name: string } }[]
  examAttempts: { id: string; score: number; passed: boolean; status: string; startedAt: string; exam: { title: string } }[]
  progress: { id: string; status: string; updatedAt: string; lesson: { title: string } }[]
  xpEvents: { id: string; amount: number; reason: string; createdAt: string }[]
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}`).then(async (response) => {
      const body = await response.json()
      if (!response.ok || !body.user) throw new Error(body.error || 'Gebruiker laden mislukt')
      return body.user as UserDetail
    }).then((body) => {
      setUser(body)
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Gebruiker laden mislukt')
      setLoading(false)
    })
  }, [params.id])

  return (
    <AdminShell title="Gebruiker detail">
      <div className="space-y-5">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B]">
          <ArrowLeft className="h-4 w-4" /> Terug naar gebruikers
        </Link>
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" /></div> : !user ? (
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-8 text-center text-sm text-slate-500">{error ?? 'Gebruiker niet gevonden.'}</Card>
        ) : (
          <>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#0B1B3B]">{user.name ?? user.email}</h2>
                  <div className="mt-1 text-sm text-slate-500">{user.email} - {user.phone ?? 'geen telefoon'} - {user.lastLoginIp ?? 'geen IP'}</div>
                </div>
                <div className="flex gap-2">
                  <Badge className="border-0 bg-[#EFF6FF] text-[#2563EB]">{user.role}</Badge>
                  {user.banned ? <Badge className="border-0 bg-[#FEF2F2] text-[#EF4444]">Banned</Badge> : null}
                </div>
              </div>
            </Card>
            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="Abonnement">
                {user.subscription ? (
                  <Row title={user.subscription.plan.name} meta={`${user.subscription.status} tot ${new Date(user.subscription.expiresAt).toLocaleDateString('nl-NL')}`} />
                ) : <Empty text="Geen abonnement" />}
              </Section>
              <Section title="Betalingen">
                {user.payments.length ? user.payments.map((payment) => (
                  <Row key={payment.id} title={`${(payment.amountCents / 100).toFixed(2)} ${payment.currency} - ${payment.plan.name}`} meta={`${payment.status} - ${new Date(payment.createdAt).toLocaleString('nl-NL')}`} />
                )) : <Empty text="Geen betalingen" />}
              </Section>
              <Section title="Examengeschiedenis">
                {user.examAttempts.length ? user.examAttempts.map((attempt) => (
                  <Row key={attempt.id} title={attempt.exam.title} meta={`${attempt.status} - ${Math.round(attempt.score * 100)}% - ${attempt.passed ? 'geslaagd' : 'niet geslaagd'}`} />
                )) : <Empty text="Geen examens" />}
              </Section>
              <Section title="Activiteit">
                {user.xpEvents.length ? user.xpEvents.map((event) => (
                  <Row key={event.id} title={`${event.amount} XP`} meta={`${event.reason} - ${new Date(event.createdAt).toLocaleString('nl-NL')}`} />
                )) : <Empty text="Geen activiteit" />}
              </Section>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6"><div className="mb-4 font-display text-lg font-bold text-[#0B1B3B]">{title}</div><div className="space-y-2">{children}</div></Card>
}

function Row({ title, meta }: { title: string; meta: string }) {
  return <div className="rounded-2xl border border-[#E4E7EE] p-3"><div className="text-sm font-semibold text-[#0B1B3B]">{title}</div><div className="text-xs text-slate-500">{meta}</div></div>
}

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-sm text-slate-500">{text}</div>
}
