'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Trophy, Clock, Zap, ArrowRight, RefreshCcw, Home, X, Check, AlertCircle } from 'lucide-react'
import { LumaLogo } from '@/components/luma/logo'

export default function ResultsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [attempt, setAttempt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviewIdx, setReviewIdx] = useState<number | null>(null)

  // Helper to parse selectedKeys (could be array from Postgres or JSON string from SQLite)
  function parseSelectedKeys(v: any): string[] {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v)
        return Array.isArray(p) ? p : v.split(',').filter(Boolean)
      } catch {
        return v.split(',').filter(Boolean)
      }
    }
    return []
  }

  useEffect(() => {
    fetch(`/api/attempts/${params.id}`).then((r) => r.json()).then((d) => {
      setAttempt(d.attempt)
      setLoading(false)
    })
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    )
  }
  if (!attempt) return null

  const passed = attempt.passed
  const scorePct = Math.round(attempt.score * 100)
  const wrongAnswers = attempt.answers.filter((a: any) => !a.isCorrect)
  const reviewed = reviewIdx !== null ? wrongAnswers[reviewIdx] : null

  // Group by topic
  const byTopic: Record<string, { correct: number; total: number; color: string }> = {}
  for (const a of attempt.answers) {
    const t = a.question.topic
    if (!byTopic[t.name]) byTopic[t.name] = { correct: 0, total: 0, color: t.color }
    byTopic[t.name].total += 1
    if (a.isCorrect) byTopic[t.name].correct += 1
  }

  const minutesTaken = Math.floor(attempt.durationSec / 60)
  const secondsTaken = String(attempt.durationSec % 60).padStart(2, '0')

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-white border-b border-[#E4E7EE]">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/exams"><LumaLogo size={32} /></Link>
          <Link href="/dashboard"><Button variant="ghost" className="rounded-xl"><Home className="w-4 h-4 mr-1.5" /> Dashboard</Button></Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Success/fail banner */}
        <div className={`rounded-3xl p-8 mb-5 relative overflow-hidden text-white ${passed ? 'bg-gradient-to-br from-[#1FB871] to-[#16A34A]' : 'bg-gradient-to-br from-[#FF6B6B] to-[#DC2626]'}`}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-center gap-5">
            <div className="text-6xl animate-pop">{passed ? '🎉' : '💪'}</div>
            <div className="flex-1">
              <h1 className="font-display font-extrabold text-3xl">{passed ? 'Geslaagd!' : 'Blijf oefenen'}</h1>
              <p className="opacity-90 mt-1">
                {passed ? 'Goed gedaan. Je bent klaar voor het echte examen.' : 'Geen zorgen. Bekijk je fouten en probeer opnieuw.'}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl text-sm font-bold">
                <Zap className="w-4 h-4" /> +{attempt.xpAwarded} XP verdiend
              </div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="font-display font-extrabold text-5xl">{attempt.correctCount}/{attempt.totalQuestions}</div>
              <div className="text-xs opacity-90 mt-1">goed</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
            <div className="text-xs text-slate-500 mb-1">Score</div>
            <div className="font-display font-extrabold text-3xl text-[#0B1B3B]">{scorePct}%</div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${passed ? 'bg-[#1FB871]' : 'bg-[#FF6B6B]'}`} style={{ width: `${scorePct}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-2">Slagingsgrens: {Math.round(attempt.exam.passingScore * 100)}%</div>
          </Card>
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
            <div className="text-xs text-slate-500 mb-1">Goed / Fout</div>
            <div className="font-display font-extrabold text-3xl text-[#0B1B3B]">
              <span className="text-[#1FB871]">{attempt.correctCount}</span>
              <span className="text-slate-400"> / </span>
              <span className="text-[#FF6B6B]">{attempt.totalQuestions - attempt.correctCount}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">{attempt.totalQuestions} vragen totaal</div>
          </Card>
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
            <div className="text-xs text-slate-500 mb-1">Tijd</div>
            <div className="font-display font-extrabold text-3xl text-[#0B1B3B]">{minutesTaken}:{secondsTaken}</div>
            <div className="text-xs text-slate-500 mt-2">van {Math.floor(attempt.exam.durationSec / 60)} min</div>
          </Card>
        </div>

        {/* Category breakdown */}
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Score per onderwerp</div>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(byTopic).map(([name, s]) => {
              const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-[#0B1B3B]">{name}</span>
                    <span className="text-slate-500">{s.correct}/{s.total} · {pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Wrong answers review */}
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-display font-bold text-lg text-[#0B1B3B]">Bekijk je fouten</div>
              <div className="text-xs text-slate-500">{wrongAnswers.length} fouten om te leren</div>
            </div>
            <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2] border-0">{wrongAnswers.length} fout</Badge>
          </div>

          {wrongAnswers.length === 0 ? (
            <div className="rounded-2xl bg-[#ECFDF3] p-6 text-center">
              <Trophy className="w-10 h-10 mx-auto text-[#FFB020] mb-2" />
              <div className="font-display font-bold text-lg text-[#0B1B3B]">Perfecte score! 🎯</div>
              <div className="text-sm text-slate-600 mt-1">Geen fouten. Je bent er helemaal klaar voor.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {wrongAnswers.map((a: any, i: number) => (
                <button
                  key={a.id}
                  onClick={() => setReviewIdx(i)}
                  className="w-full text-left rounded-2xl border border-[#E4E7EE] hover:border-[#2563EB] p-4 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge className="bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF] border-0 text-xs">{a.question.topic.name}</Badge>
                    <div className="text-xs text-slate-500">Jouw: <span className="font-bold text-[#FF6B6B]">{parseSelectedKeys(a.selectedKeys).join(',') || '—'}</span> · Correct: <span className="font-bold text-[#1FB871]">{a.question.options.filter((o: any) => o.isCorrect).map((o: any) => o.key).join(',')}</span></div>
                  </div>
                  <div className="font-semibold text-sm text-[#0B1B3B] line-clamp-2">{a.question.stem}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* CTAs */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Link href="/exams" className="flex-1">
            <Button variant="outline" className="w-full rounded-xl h-12 border-[#E4E7EE]">
              <RefreshCcw className="w-4 h-4 mr-1.5" /> Opnieuw
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl h-12">
              Naar dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Mistake review modal */}
      {reviewed && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setReviewIdx(null)}>
          <Card className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF] border-0">{reviewed.question.topic.name}</Badge>
              <button onClick={() => setReviewIdx(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="font-display font-bold text-xl text-[#0B1B3B] mb-5">{reviewed.question.stem}</h2>
            <div className="space-y-2 mb-5">
              {reviewed.question.options.map((opt: any) => {
                const isCorrect = opt.isCorrect
                const isSelected = parseSelectedKeys(reviewed.selectedKeys).includes(opt.key)
                return (
                  <div
                    key={opt.id}
                    className={`rounded-2xl border-2 p-3.5 flex items-center gap-3 ${
                      isCorrect ? 'border-[#1FB871] bg-[#ECFDF3]' :
                      isSelected ? 'border-[#FF6B6B] bg-[#FEF2F2]' :
                      'border-[#E4E7EE]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isCorrect ? 'bg-[#1FB871] text-white' :
                      isSelected ? 'bg-[#FF6B6B] text-white' :
                      'bg-[#F4F7FB] text-slate-600'
                    }`}>{opt.key}</div>
                    <div className="flex-1 font-semibold text-sm text-[#0B1B3B]">{opt.text}</div>
                    {isCorrect && <Check className="w-4 h-4 text-[#1FB871]" />}
                    {isSelected && !isCorrect && <X className="w-4 h-4 text-[#FF6B6B]" />}
                  </div>
                )
              })}
            </div>
            <div className="rounded-2xl bg-[#F4F7FB] p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-[#2563EB]" />
                <div className="font-semibold text-sm text-[#0B1B3B]">Uitleg</div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{reviewed.question.explanation}</p>
            </div>
            <div className="mt-4 flex justify-between">
              <Button variant="outline" disabled={reviewIdx === 0} onClick={() => setReviewIdx(reviewIdx! - 1)} className="rounded-xl border-[#E4E7EE]">Vorige fout</Button>
              <Button variant="outline" disabled={reviewIdx === wrongAnswers.length - 1} onClick={() => setReviewIdx(reviewIdx! + 1)} className="rounded-xl border-[#E4E7EE]">Volgende fout</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
