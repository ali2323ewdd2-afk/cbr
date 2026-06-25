'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Clock, Flag, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { LumaLogo } from '@/components/luma/logo'
import Link from 'next/link'

export default function ExamTakingPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [attempt, setAttempt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { selectedKeys: string[]; timeMs?: number; marked?: boolean }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const submitRef = useRef<(auto?: boolean) => void>(() => {})

  useEffect(() => {
    ;(async () => {
      const [examRes, attemptRes] = await Promise.all([
        fetch(`/api/exams/${params.id}`),
        fetch(`/api/exams/${params.id}/start`, { method: 'POST' }),
      ])
      if (examRes.status === 402) {
        toast.error('Abonnement vereist voor dit examen')
        router.push('/#pricing')
        return
      }
      const e = await examRes.json()
      const a = await attemptRes.json()
      setExam(e.exam)
      setAttempt(a.attempt)
      setTimeLeft(e.exam.durationSec)
      setLoading(false)
    })()
  }, [params.id, router])

  // Timer — uses ref to call latest submit without re-subscribing
  useEffect(() => {
    if (!attempt || timeLeft <= 0) return
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          submitRef.current(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [attempt])

  function selectOption(eqId: string, optionKey: string) {
    setAnswers((prev) => {
      const current = prev[eqId] ?? { selectedKeys: [] }
      const idx = current.selectedKeys.indexOf(optionKey)
      let newKeys: string[]
      if (idx >= 0) newKeys = current.selectedKeys.filter((k) => k !== optionKey)
      else newKeys = [...current.selectedKeys, optionKey]
      return { ...prev, [eqId]: { ...current, selectedKeys: newKeys } }
    })
  }

  function toggleMark(eqId: string) {
    setAnswers((prev) => ({
      ...prev,
      [eqId]: { ...(prev[eqId] ?? { selectedKeys: [] }), marked: !prev[eqId]?.marked },
    }))
  }

  async function submit(auto = false) {
    if (!attempt || !exam) return
    setSubmitting(true)
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    const payload = {
      attemptId: attempt.id,
      durationSec,
      answers: exam.questions.map((eq: any) => ({
        examQuestionId: eq.id,
        selectedKeys: answers[eq.id]?.selectedKeys ?? [],
        timeMs: 0,
        marked: answers[eq.id]?.marked ?? false,
      })),
    }
    const res = await fetch(`/api/exams/${params.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSubmitting(false)
    if (data.attempt) {
      router.push(`/results/${data.attempt.id}`)
    } else {
      toast.error('Er ging iets mis bij het insturen.')
    }
  }
  // Keep the ref pointing at the latest submit without writing to it during render
  // (react-hooks/refs). The timer reads submitRef.current to call the freshest closure.
  useEffect(() => {
    submitRef.current = submit
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    )
  }
  if (!exam) return null

  const q = exam.questions[current]
  const total = exam.questions.length
  const answered = Object.values(answers).filter((a) => a.selectedKeys.length > 0).length
  const minutesLeft = Math.floor(timeLeft / 60)
  const secondsLeft = String(timeLeft % 60).padStart(2, '0')
  const timeWarning = timeLeft < 60

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Exam header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EE]">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/exams" className="text-slate-600 hover:text-[#0B1B3B]">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="font-display font-bold text-sm text-[#0B1B3B]">{exam.title}</div>
              <div className="text-xs text-slate-500">Vraag {current + 1} van {total}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${timeWarning ? 'bg-[#FEF2F2] text-[#EF4444] animate-pulse-soft' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
              <Clock className="w-4 h-4" /> {minutesLeft}:{secondsLeft}
            </div>
            <Button onClick={() => submit()} disabled={submitting} className="bg-blue-gradient text-white rounded-xl h-10">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inleveren'}
            </Button>
          </div>
        </div>
        {/* Progress dots */}
        <div className="max-w-5xl mx-auto px-5 pb-3 overflow-x-auto">
          <div className="flex gap-1.5">
            {exam.questions.map((eq: any, i: number) => {
              const isAnswered = answers[eq.id]?.selectedKeys.length > 0
              const isMarked = answers[eq.id]?.marked
              const isCurrent = i === current
              return (
                <button
                  key={eq.id}
                  onClick={() => setCurrent(i)}
                  className={`relative w-7 h-7 rounded-lg text-xs font-bold transition ${
                    isCurrent ? 'bg-[#2563EB] text-white ring-2 ring-[#2563EB]/30' :
                    isMarked ? 'bg-[#FFB020] text-white' :
                    isAnswered ? 'bg-[#1FB871] text-white' : 'bg-[#F4F7FB] text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                  {isMarked && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF6B6B]" />}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-7">
          <div className="flex items-center justify-between mb-5">
            <Badge className="bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF] border-0">{q.question.topic.name}</Badge>
            <button onClick={() => toggleMark(q.id)} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition ${answers[q.id]?.marked ? 'bg-[#FFB020] text-white' : 'bg-[#F4F7FB] text-slate-600 hover:bg-slate-200'}`}>
              <Flag className="w-3.5 h-3.5" /> {answers[q.id]?.marked ? 'Gemarkeerd' : 'Markeer'}
            </button>
          </div>

          {q.question.imageUrl && (
            <div className="rounded-2xl bg-[#F4F7FB] aspect-video mb-5 flex items-center justify-center">
              <img src={q.question.imageUrl} alt="" className="max-h-full max-w-full rounded-xl" />
            </div>
          )}

          <h2 className="font-display font-bold text-xl text-[#0B1B3B] leading-relaxed mb-5 text-balance">
            {q.question.stem}
          </h2>

          {q.question.scenarioText && (
            <div className="rounded-xl bg-[#F4F7FB] p-3 text-sm text-slate-600 mb-4">{q.question.scenarioText}</div>
          )}

          <div className="space-y-3">
            {q.question.options.map((opt: any) => {
              const selected = answers[q.id]?.selectedKeys.includes(opt.key)
              return (
                <button
                  key={opt.id}
                  onClick={() => selectOption(q.id, opt.key)}
                  className={`w-full text-left rounded-2xl border-2 p-4 flex items-center gap-3 transition ${
                    selected ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E4E7EE] hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition ${
                    selected ? 'bg-blue-gradient text-white' : 'bg-[#F4F7FB] text-slate-600'
                  }`}>{opt.key}</div>
                  <div className="flex-1 font-semibold text-[#0B1B3B]">{opt.text}</div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Footer navigation */}
        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            className="rounded-xl h-11 border-[#E4E7EE]"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5" /> Vorige
          </Button>
          <div className="text-xs text-slate-500">
            {answered} van {total} beantwoord
          </div>
          {current < total - 1 ? (
            <Button onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))} className="bg-blue-gradient text-white rounded-xl h-11">
              Volgende <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={() => submit()} disabled={submitting} className="bg-[#1FB871] hover:bg-[#16A34A] text-white rounded-xl h-11">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inleveren'}
            </Button>
          )}
        </div>

        {/* Question navigator (mobile-friendly) */}
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-5 mt-5">
          <div className="font-display font-bold text-sm text-[#0B1B3B] mb-3">Overzicht</div>
          <div className="text-xs text-slate-500 mb-3">Je hebt nog {total - answered} onbeantwoorde vragen</div>
          <div className="grid grid-cols-10 gap-1.5">
            {exam.questions.map((eq: any, i: number) => {
              const isAnswered = answers[eq.id]?.selectedKeys.length > 0
              const isMarked = answers[eq.id]?.marked
              const isCurrent = i === current
              return (
                <button
                  key={eq.id}
                  onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition ${
                    isCurrent ? 'bg-[#2563EB] text-white' :
                    isMarked ? 'bg-[#FFB020] text-white' :
                    isAnswered ? 'bg-[#1FB871] text-white' : 'bg-[#F4F7FB] text-slate-500 hover:bg-slate-200'
                  }`}
                >{i + 1}</button>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
