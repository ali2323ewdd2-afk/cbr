'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Bot, Zap, Users, TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'

export default function AdminAiUsagePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/ai-usage').then(async (r) => {
      const d = await r.json()
      if (!r.ok || typeof d.totalSessions !== 'number') throw new Error(d.error || 'AI usage laden mislukt')
      return d
    }).then((d) => {
      setData(d)
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'AI usage laden mislukt')
      setLoading(false)
    })
  }, [])

  if (loading) return <AdminShell title="AI Usage"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AdminShell>
  if (!data) return <AdminShell title="AI Usage"><div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error ?? 'AI usage data niet beschikbaar'}</div></AdminShell>

  const kpis = [
    { label: 'Totaal sessies', value: data.totalSessions, icon: Bot, color: '#7C5CFC' },
    { label: 'Totaal berichten', value: data.totalMessages, icon: Zap, color: '#FFB020' },
    { label: 'Tokens in', value: data.totalTokensIn.toLocaleString('nl-NL'), icon: TrendingUp, color: '#2563EB' },
    { label: 'Tokens out', value: data.totalTokensOut.toLocaleString('nl-NL'), icon: TrendingUp, color: '#1FB871' },
  ]

  return (
    <AdminShell title="AI Usage">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <Card key={i} className="rounded-3xl border-[#E4E7EE] shadow-card p-5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2" style={{ backgroundColor: k.color + '20', color: k.color }}><k.icon className="w-5 h-5" /></div>
            <div className="font-display font-extrabold text-2xl text-[#0B1B3B]">{k.value}</div>
            <div className="text-xs text-slate-500">{k.label}</div>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">AI Usage trend (14 dagen)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EE" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E4E7EE' }} />
              <Bar dataKey="messages" fill="#7C5CFC" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Top gebruikers</div>
        <div className="space-y-2">
          {data.topUsers.map((u: any, i: number) => (
            <div key={u.sessionId} className="flex items-center gap-3 p-3 rounded-xl bg-[#F4F7FB]">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-[#FFB020] text-white' : 'bg-white text-slate-600'}`}>{i + 1}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-[#0B1B3B]">{u.userName}</div>
                <div className="text-xs text-slate-500 truncate">{u.title}</div>
              </div>
              <Badge className="bg-[#7C5CFC]/10 text-[#7C5CFC] hover:bg-[#7C5CFC]/10 border-0">{u.messages} berichten</Badge>
            </div>
          ))}
        </div>
      </Card>
    </AdminShell>
  )
}
