'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Calendar, Clock, Target, Plus, Check, Loader2 } from 'lucide-react'

export default function PlannerPage() {
  const [plan, setPlan] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ examDate: '', dailyMinutes: 30, questionsPerDay: 15, examsPerWeek: 2 })

  useEffect(() => {
    fetch('/api/planner').then((r) => r.json()).then((d) => {
      setPlan(d.plan)
      setUser(d.user)
      if (d.plan) {
        setForm({
          examDate: d.plan.examDate?.slice(0, 10) ?? '',
          dailyMinutes: d.plan.dailyMinutes,
          questionsPerDay: d.plan.questionsPerDay,
          examsPerWeek: d.plan.examsPerWeek,
        })
      }
      setLoading(false)
    })
  }, [])

  async function savePlan() {
    const res = await fetch('/api/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setPlan(d.plan)
    setEditing(false)
    toast.success('Studieplan bijgewerkt! 🎯')
  }

  if (loading) {
    return (
      <AppShell title="Study Planner">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        </div>
      </AppShell>
    )
  }

  const examDate = new Date(plan.examDate)
  const daysUntil = Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / 86400000))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const completedDays = plan.days.filter((d: any) => d.status === 'DONE').length
  const totalPlanDays = plan.days.length
  const planPct = totalPlanDays > 0 ? Math.round((completedDays / totalPlanDays) * 100) : 0

  return (
    <AppShell title="Study Planner">
      {/* Header */}
      <div className="rounded-3xl bg-navy-gradient p-6 md:p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#5C8BFF]/30 blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 mb-2">AI-gegenereerd</Badge>
            <h2 className="font-display font-extrabold text-3xl">Jouw studieplan</h2>
            <p className="text-slate-300 mt-1 max-w-xl">AI berekent automatisch wat je per dag moet doen om te slagen.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <div className="text-xs text-slate-300">Examen</div>
              <div className="font-display font-bold text-lg">{examDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</div>
              <div className="text-xs text-[#5C8BFF] mt-0.5">nog {daysUntil} dagen</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <div className="text-xs text-slate-300">Voortgang</div>
              <div className="font-display font-bold text-lg">{planPct}%</div>
              <div className="text-xs text-[#1FB871] mt-0.5">{completedDays}/{totalPlanDays} dagen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings card */}
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display font-bold text-base text-[#0B1B3B]">Plan-instellingen</div>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-xl border-[#E4E7EE]">
              Bewerken
            </Button>
          ) : (
            <Button size="sm" onClick={savePlan} className="rounded-xl bg-blue-gradient text-white">
              Opslaan
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-slate-600">Examen datum</Label>
            {editing ? (
              <Input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="rounded-xl mt-1" />
            ) : (
              <div className="mt-1 font-semibold text-sm text-[#0B1B3B]">{examDate.toLocaleDateString('nl-NL')}</div>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-600">Minuten per dag</Label>
            {editing ? (
              <Input type="number" value={form.dailyMinutes} onChange={(e) => setForm({ ...form, dailyMinutes: +e.target.value })} className="rounded-xl mt-1" />
            ) : (
              <div className="mt-1 font-semibold text-sm text-[#0B1B3B]">{plan.dailyMinutes} min</div>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-600">Vragen per dag</Label>
            {editing ? (
              <Input type="number" value={form.questionsPerDay} onChange={(e) => setForm({ ...form, questionsPerDay: +e.target.value })} className="rounded-xl mt-1" />
            ) : (
              <div className="mt-1 font-semibold text-sm text-[#0B1B3B]">{plan.questionsPerDay}</div>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-600">Examens per week</Label>
            {editing ? (
              <Input type="number" value={form.examsPerWeek} onChange={(e) => setForm({ ...form, examsPerWeek: +e.target.value })} className="rounded-xl mt-1" />
            ) : (
              <div className="mt-1 font-semibold text-sm text-[#0B1B3B]">{plan.examsPerWeek}</div>
            )}
          </div>
        </div>
      </Card>

      {/* Week grid */}
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-5">
        <div className="font-display font-bold text-base text-[#0B1B3B] mb-4">Week overzicht</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {plan.days.slice(0, 14).map((d: any) => {
            const date = new Date(d.date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isDone = d.status === 'DONE'
            const isRest = d.isRest
            const weekday = date.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')
            const dayNum = date.getDate()
            return (
              <div
                key={d.id}
                className={`rounded-2xl p-3 border-2 transition ${
                  isToday ? 'border-[#2563EB] bg-[#EFF6FF]' :
                  isDone ? 'border-[#1FB871] bg-[#ECFDF3]' :
                  isRest ? 'border-[#E4E7EE] bg-[#F4F7FB]' :
                  'border-[#E4E7EE] bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">{weekday}</div>
                    <div className="font-display font-bold text-lg text-[#0B1B3B]">{dayNum}</div>
                  </div>
                  {isDone && <div className="w-6 h-6 rounded-full bg-[#1FB871] flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></div>}
                  {isToday && <Badge className="bg-[#2563EB] text-white hover:bg-[#2563EB] border-0 text-[10px]">Vandaag</Badge>}
                </div>
                <div className="text-xs font-semibold text-[#0B1B3B] mb-1.5 leading-tight min-h-[2.5rem]">
                  {d.title}
                </div>
                {isRest ? (
                  <div className="text-xs text-slate-500">😌</div>
                ) : (
                  <div className="text-xs text-slate-500">
                    {d.lessonsDone}/{d.lessonsGoal} lessen · {d.questionsDone}/{d.questionsGoal} vragen
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </AppShell>
  )
}
