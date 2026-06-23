'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trophy, Clock, Zap } from 'lucide-react'

export default function ChallengesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/challenges').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <AppShell title="Challenges"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AppShell>
  if (!data) return null

  return (
    <AppShell title="Challenges">
      <div className="rounded-3xl bg-gradient-to-br from-[#FFB020] to-[#FF6B6B] p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 mb-3">Weekly & Monthly</Badge>
          <h2 className="font-display font-extrabold text-3xl mb-2">Challenges</h2>
          <p className="text-slate-100 max-w-xl">Voltooi wekelijkse en maandelijkse challenges voor extra XP en exclusieve badges.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {data.challenges.map((c: any) => {
          const pct = c.goalValue > 0 ? Math.min(100, Math.round((c.myProgress / c.goalValue) * 100)) : 0
          const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000))
          return (
            <Card key={c.id} className={`rounded-3xl border-[#E4E7EE] shadow-card p-6 ${c.myCompleted ? 'bg-gradient-to-br from-[#ECFDF3] to-[#DCFCE7]' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`border-0 text-xs ${c.type === 'WEEKLY' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3EEFF] text-[#7C5CFC]'}`}>{c.type}</Badge>
                    {c.myCompleted && <Badge className="bg-[#1FB871] text-white hover:bg-[#1FB871] border-0">Voltooid!</Badge>}
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#0B1B3B]">{c.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{c.description}</p>
                </div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFB020]/20 text-[#FFB020]">
                  <Trophy className="w-6 h-6" />
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#0B1B3B]">{c.myProgress} / {c.goalValue} {c.metric.toLowerCase()}</span>
                  <span className="text-slate-500">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${c.myCompleted ? 'bg-gradient-to-r from-[#1FB871] to-[#16A34A]' : 'bg-gradient-to-r from-[#FFB020] to-[#FF6B6B]'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-[#FFB020] font-semibold"><Zap className="w-3.5 h-3.5" /> +{c.xpReward} XP</span>
                  <span className="inline-flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5" /> {daysLeft} dagen</span>
                </div>
                {c.badgeSlug && <Badge className="bg-[#F3EEFF] text-[#7C5CFC] hover:bg-[#F3EEFF] border-0 text-xs">+ Badge</Badge>}
              </div>
            </Card>
          )
        })}
      </div>

      {data.challenges.length === 0 && (
        <Card className="rounded-3xl p-10 text-center">
          <Trophy className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <div className="font-display font-bold text-lg text-[#0B1B3B]">Geen actieve challenges</div>
          <div className="text-sm text-slate-500 mt-1">Kom later terug voor nieuwe challenges.</div>
        </Card>
      )}
    </AppShell>
  )
}
