'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(async (r) => {
      const d = await r.json()
      if (!r.ok || !d.totals || !Array.isArray(d.revenueByMonth)) throw new Error(d.error || 'Analytics laden mislukt')
      return d
    }).then((d) => {
      setStats(d)
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Analytics laden mislukt')
      setLoading(false)
    })
  }, [])

  if (loading || !stats) {
    return (
      <AdminShell title="Analytics">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div> : <div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error ?? 'Analytics data niet beschikbaar'}</div>}
      </AdminShell>
    )
  }

  const t = stats.totals
  const revenueData = stats.revenueByMonth.map((r: any) => ({
    month: r.month.split('-')[1] + '/' + r.month.split('-')[0].slice(2),
    omzet: r.cents / 100,
  }))

  const pieData = [
    { name: 'Actief', value: t.activeSubscriptions, color: '#1FB871' },
    { name: 'Inactief', value: Math.max(0, t.totalUsers - t.activeSubscriptions), color: '#E4E7EE' },
  ]

  const kpiCards = [
    { label: 'Totaal gebruikers', value: t.totalUsers, color: '#2563EB' },
    { label: 'Actieve abonnees', value: t.activeSubscriptions, color: '#1FB871' },
    { label: 'Lessen voltooid', value: t.lessonsCompleted, color: '#FFB020' },
    { label: 'Examens gemaakt', value: t.examsTaken, color: '#7C5CFC' },
    { label: 'Geslaagd', value: t.passedThisWeek, color: '#FF6B6B' },
    { label: 'Slagingspercentage', value: `${t.passRate}%`, color: '#0B1B3B' },
    { label: 'Conversie', value: `${t.conversionRate}%`, color: '#0284C7' },
    { label: 'Totale omzet', value: `€${(t.totalRevenueCents / 100).toLocaleString('nl-NL')}`, color: '#16A34A' },
  ]

  return (
    <AdminShell title="Analytics">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {kpiCards.map((k, i) => (
          <Card key={i} className="rounded-3xl border-[#E4E7EE] shadow-card p-5">
            <div className="text-xs text-slate-500 mb-1">{k.label}</div>
            <div className="font-display font-extrabold text-2xl" style={{ color: k.color }}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 lg:col-span-2">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Omzet ontwikkeling</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EE" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E4E7EE' }}
                  formatter={(v: any) => [`€${v}`, 'Omzet']}
                />
                <Bar dataKey="omzet" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Abonnementen</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </AdminShell>
  )
}
