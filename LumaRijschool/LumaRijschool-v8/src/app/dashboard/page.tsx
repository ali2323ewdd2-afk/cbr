'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import {
  Zap, Flame, Trophy, BookOpen, FileText, TrendingUp, Sparkles,
  ChevronRight, ArrowRight, Calendar, Award, Target, AlertCircle,
} from 'lucide-react'

interface DashboardData {
  user: { id: string; name: string; email: string; studyGoal: string; examDate: string | null }
  gamification: {
    totalXp: number; level: number; xpIntoLevel: number; xpForNext: number; progressToNext: number
    streak: number; longestStreak: number; badges: any[]; readiness: number
  }
  stats: { completedLessons: number; totalLessons: number; lessonsPct: number; examsTaken: number; todayLessons: number; todayExams: number; todayAnswers: number }
  subscription: { plan: { name: string }; status: string; expiresAt: string; daysLeft: number; isActive: boolean } | null
  recentAttempts: any[]
  categoryScores: any[]
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const params = useSearchParams()

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
    if (params.get('subscribed') === '1') {
      toast.success('Welkom bij LumaRijschool! Je abonnement is actief. 🎉')
    }
  }, [params])

  if (loading || !data) {
    return (
      <AppShell title="Dashboard">
        <div className="grid lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-3xl h-40 animate-pulse bg-slate-100" />
          ))}
        </div>
      </AppShell>
    )
  }

  const firstName = data.user.name?.split(' ')[0] ?? 'student'
  const today = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <AppShell title="Dashboard">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-navy-gradient p-6 md:p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#5C8BFF]/30 blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-300 mb-1">{today}</div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl">Welkom terug, {firstName} 👋</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <Zap className="w-3.5 h-3.5 text-[#FFB020]" /> Level {data.gamification.level}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <span className="font-bold">{data.gamification.totalXp.toLocaleString('nl-NL')}</span> XP totaal
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <Flame className="w-3.5 h-3.5 text-[#FF6B6B]" /> {data.gamification.streak} dagen streak
              </span>
            </div>
          </div>
          <Link href="/lessons">
            <Button className="bg-white text-[#2563EB] hover:bg-slate-100 rounded-xl h-12 px-5 font-semibold shadow-luma-soft">
              Verder leren <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Readiness + today */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-slate-500">Examengereedheid</div>
              <div className="font-display font-extrabold text-3xl text-[#0B1B3B]">{data.gamification.readiness}%</div>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ECFDF3] text-[#16A34A]">
              <Target className="w-6 h-6" />
            </div>
          </div>
          <Progress value={data.gamification.readiness} className="h-2.5" indicatorClassName="bg-gradient-to-r from-[#1FB871] to-[#16A34A]" />
          <div className="text-xs text-slate-500 mt-2">
            {data.gamification.readiness >= 87 ? 'Klaar voor je examen!' : data.gamification.readiness >= 60 ? 'Goed op weg, blijf oefenen' : 'Begin met lessen om op te bouwen'}
          </div>
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display font-bold text-lg text-[#0B1B3B]">Vandaag</div>
            <Badge className="bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF] border-0">Dagdoel</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#F4F7FB] p-4">
              <div className="text-xs text-slate-500 mb-1">Lessen voltooid</div>
              <div className="font-display font-extrabold text-2xl text-[#0B1B3B]">{data.stats.todayLessons}</div>
              <div className="text-xs text-[#2563EB] font-semibold mt-1">+30 XP</div>
            </div>
            <div className="rounded-2xl bg-[#F4F7FB] p-4">
              <div className="text-xs text-slate-500 mb-1">Examens gemaakt</div>
              <div className="font-display font-extrabold text-2xl text-[#0B1B3B]">{data.stats.todayExams}</div>
              <div className="text-xs text-[#2563EB] font-semibold mt-1">+90 XP</div>
            </div>
            <div className="rounded-2xl bg-[#F4F7FB] p-4">
              <div className="text-xs text-slate-500 mb-1">Vragen beantwoord</div>
              <div className="font-display font-extrabold text-2xl text-[#0B1B3B]">{data.stats.todayAnswers}</div>
              <div className="text-xs text-[#2563EB] font-semibold mt-1">+{Math.round(data.stats.todayAnswers * 1.5)} XP</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Link href="/lessons" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl h-10 border-[#E4E7EE]">
                <BookOpen className="w-4 h-4 mr-1.5" /> Lessen
              </Button>
            </Link>
            <Link href="/exams" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl h-10 border-[#E4E7EE]">
                <FileText className="w-4 h-4 mr-1.5" /> Examen
              </Button>
            </Link>
            <Link href="/tutor" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-[#7C5CFC] to-[#5C8BFF] text-white rounded-xl h-10">
                <Sparkles className="w-4 h-4 mr-1.5" /> AI Tutor
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Subscription + progress */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-bold text-lg text-[#0B1B3B]">Voortgang lessen</div>
            <BookOpen className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display font-extrabold text-3xl text-[#0B1B3B]">{data.stats.completedLessons}</span>
            <span className="text-sm text-slate-500">/ {data.stats.totalLessons} voltooid</span>
          </div>
          <Progress value={data.stats.lessonsPct * 100} className="h-2.5" indicatorClassName="bg-gradient-to-r from-[#2563EB] to-[#5C8BFF]" />
          <Link href="/lessons">
            <Button variant="ghost" className="mt-3 -ml-2 text-[#2563EB] hover:bg-[#EFF6FF] text-sm font-semibold">
              Bekijk alle lessen <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-bold text-lg text-[#0B1B3B]">Abonnement</div>
            <Award className="w-5 h-5 text-slate-400" />
          </div>
          {data.subscription && data.subscription.isActive ? (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display font-extrabold text-2xl text-[#0B1B3B]">{data.subscription.plan.name}</span>
                <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Actief</Badge>
              </div>
              <div className="text-sm text-slate-500">Nog {data.subscription.daysLeft} dagen</div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#1FB871] to-[#16A34A]" style={{ width: `${Math.min(100, (data.subscription.daysLeft / 30) * 100)}%` }} />
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-500 mb-3">Geen actief abonnement</div>
              <Link href="/#pricing">
                <Button className="w-full bg-blue-gradient text-white rounded-xl h-10">Abonnement nemen</Button>
              </Link>
            </>
          )}
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-bold text-lg text-[#0B1B3B]">Badges</div>
            <Trophy className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display font-extrabold text-3xl text-[#0B1B3B]">{data.gamification.badges.length}</span>
            <span className="text-sm text-slate-500">verdiend</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.gamification.badges.slice(0, 6).map((b) => (
              <div key={b.id} className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-lg" style={{ backgroundColor: (b.color || '#2563EB') + '20' }} title={b.name}>
                {b.iconKey}
              </div>
            ))}
            {data.gamification.badges.length === 0 && (
              <div className="text-xs text-slate-400">Maak je eerste examen om een badge te verdienen!</div>
            )}
          </div>
        </Card>
      </div>

      {/* Category breakdown + recent attempts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display font-bold text-lg text-[#0B1B3B]">Score per onderwerp</div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          {data.categoryScores.length === 0 ? (
            <div className="rounded-2xl bg-[#F4F7FB] p-5 text-center text-sm text-slate-500">
              <AlertCircle className="w-5 h-5 mx-auto mb-2 text-slate-400" />
              Maak een examen om je score per onderwerp te zien.
            </div>
          ) : (
            <div className="space-y-3">
              {data.categoryScores.map((c) => {
                const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-[#0B1B3B]">{c.topic.name}</span>
                      <span className="text-slate-500">{pct}% · {c.correct}/{c.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.topic.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display font-bold text-lg text-[#0B1B3B]">Recente examens</div>
            <Link href="/exams" className="text-xs text-[#2563EB] font-semibold">Alle examens →</Link>
          </div>
          {data.recentAttempts.length === 0 ? (
            <div className="rounded-2xl bg-[#F4F7FB] p-5 text-center text-sm text-slate-500">
              Nog geen examens gemaakt. Tijd voor je eerste!
              <Link href="/exams">
                <Button className="mt-3 bg-blue-gradient text-white rounded-xl h-10">Start examen</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentAttempts.map((a) => (
                <Link key={a.id} href={`/results/${a.id}`} className="flex items-center justify-between rounded-2xl p-3 hover:bg-[#F4F7FB] transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${a.passed ? 'bg-[#ECFDF3] text-[#16A34A]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                      {Math.round(a.score * 100)}%
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#0B1B3B]">{a.exam.title}</div>
                      <div className="text-xs text-slate-500">{a.finishedAt ? new Date(a.finishedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''}</div>
                    </div>
                  </div>
                  <div className="text-xs">
                    {a.passed ? <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Geslaagd</Badge> : <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2] border-0">Niet geslaagd</Badge>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
