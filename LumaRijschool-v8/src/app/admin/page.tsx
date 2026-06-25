'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, DollarSign, UserPlus, Trophy, Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(async (r) => {
        const body = await r.json()
        if (!r.ok || !body.totals || !Array.isArray(body.revenueByMonth)) throw new Error(body.error || 'Stats laden mislukt')
        return body
      }),
      fetch('/api/admin/activity').then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Activiteit laden mislukt')
        return body
      }),
      fetch('/api/admin/users?pageSize=5').then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Gebruikers laden mislukt')
        return body
      }),
    ]).then(([s, a, u]) => {
      setStats(s)
      setActivity(a.activity || [])
      setUsers(u.users || [])
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Dashboard laden mislukt')
      setLoading(false)
    })
  }, [])

  if (loading || !stats) {
    return (
      <AdminShell title="Admin Dashboard">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div> : <div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error ?? 'Dashboard data niet beschikbaar'}</div>}
      </AdminShell>
    )
  }

  const t = stats.totals
  const revenueData = stats.revenueByMonth.map((r: any) => ({
    month: r.month.split('-')[1] + '/' + r.month.split('-')[0].slice(2),
    omzet: r.cents / 100,
  }))

  const kpis = [
    { label: 'Actieve abonnees', value: t.activeSubscriptions.toLocaleString('nl-NL'), delta: '+6,2%', up: true, icon: Users, color: '#2563EB' },
    { label: 'Omzet deze maand', value: `€${(t.monthlyRevenueCents / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`, delta: '+11%', up: true, icon: DollarSign, color: '#1FB871' },
    { label: 'Gasten vandaag', value: t.guestsToday.toLocaleString('nl-NL'), delta: `${t.conversionRate}% wordt lid`, up: true, icon: UserPlus, color: '#FFB020' },
    { label: 'Geslaagd deze week', value: t.passedThisWeek.toLocaleString('nl-NL'), delta: `${t.passRate}% slagingskans`, up: true, icon: Trophy, color: '#7C5CFC' },
  ]

  return (
    <AdminShell title="Admin Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <Card key={i} className="rounded-3xl border-[#E4E7EE] shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: k.color + '20', color: k.color }}>
                <k.icon className="w-5 h-5" />
              </div>
              <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0 text-xs">
                {k.up ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {k.delta}
              </Badge>
            </div>
            <div className="font-display font-extrabold text-2xl text-[#0B1B3B]">{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Revenue chart + recent activity */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-display font-bold text-lg text-[#0B1B3B]">Omzet</div>
              <div className="text-xs text-slate-500">Laatste 12 maanden</div>
            </div>
            <Badge className="bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF] border-0">Jaar</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EE" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E4E7EE', boxShadow: '0 10px 30px -10px rgba(11,27,59,0.2)' }}
                  formatter={(v: any) => [`€${v}`, 'Omzet']}
                />
                <Area type="monotone" dataKey="omzet" stroke="#2563EB" strokeWidth={3} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Recente activiteit</div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activity.map((a, i) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                  a.type === 'subscribe' ? 'bg-[#1FB871]/20 text-[#16A34A]' :
                  a.type === 'register' ? 'bg-[#2563EB]/20 text-[#2563EB]' :
                  a.type === 'exam' ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]' :
                  a.type === 'perfect' ? 'bg-[#FFB020]/20 text-[#FFB020]' :
                  'bg-[#FF6B6B]/20 text-[#FF6B6B]'
                }`}>
                  {a.user[0]?.toUpperCase() ?? 'G'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold text-[#0B1B3B]">{a.user}</span>{' '}
                    <span className="text-slate-600">{a.text}</span>
                  </div>
                  <div className="text-xs text-slate-400">{timeAgo(a.when)}</div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <div className="text-sm text-slate-500 text-center py-8">Nog geen activiteit</div>}
          </div>
        </Card>
      </div>

      {/* Users table */}
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display font-bold text-lg text-[#0B1B3B]">Gebruikersbeheer</div>
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="rounded-xl border-[#E4E7EE]">Alle gebruikers →</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E4E7EE] text-left">
                <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Gebruiker</th>
                <th className="text-xs font-semibold text-slate-500 uppercase pb-3 hidden md:table-cell">Land · Device</th>
                <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Abonnement</th>
                <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Status</th>
                <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#E4E7EE]/50 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-gradient text-white flex items-center justify-center font-bold text-sm">
                        {(u.name ?? 'S')[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#0B1B3B]">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 hidden md:table-cell">
                    <div className="text-sm">🇳🇱 {u.country}</div>
                  </td>
                  <td className="py-3">
                    <div className="text-sm font-semibold text-[#0B1B3B]">{u.subscription?.plan ?? '—'}</div>
                  </td>
                  <td className="py-3">
                    {u.subscription?.status === 'ACTIVE' ? <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Actief</Badge> :
                     u.subscription?.status === 'EXPIRED' ? <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2] border-0">Verloopt</Badge> :
                     <Badge className="bg-[#F4F7FB] text-slate-500 hover:bg-[#F4F7FB] border-0">Gast</Badge>}
                  </td>
                  <td className="py-3 text-right">
                    <Link href="/admin/users">
                      <Button variant="ghost" size="sm" className="rounded-xl">→</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}

function timeAgo(d: string | Date) {
  const date = new Date(d)
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'zojuist'
  if (s < 3600) return `${Math.floor(s / 60)} min geleden`
  if (s < 86400) return `${Math.floor(s / 3600)} uur geleden`
  return `${Math.floor(s / 86400)} dagen geleden`
}
