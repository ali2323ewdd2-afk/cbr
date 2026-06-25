'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface ResultDetail {
  id: string
  score: number
  correctCount: number
  totalQuestions: number
  passed: boolean
  durationSec: number
  user: { name: string | null; email: string }
  exam: { title: string }
  answers: {
    id: string
    selectedKeys: string
    isCorrect: boolean
    timeMs: number
    question: {
      stem: string
      explanation: string
      topic: { name: string }
      options: { key: string; text: string; isCorrect: boolean }[]
    }
  }[]
}

export default function AdminResultDetailPage() {
  const params = useParams<{ id: string }>()
  const [result, setResult] = useState<ResultDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/results?id=${params.id}`).then(async (response) => {
      const body = await response.json()
      if (!response.ok || !body.result) throw new Error(body.error || 'Resultaat laden mislukt')
      return body.result as ResultDetail
    }).then((body) => {
      setResult(body)
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Resultaat laden mislukt')
      setLoading(false)
    })
  }, [params.id])

  return (
    <AdminShell title="Resultaat detail">
      <div className="space-y-5">
        <Link href="/admin/results" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B]">
          <ArrowLeft className="h-4 w-4" /> Terug naar resultaten
        </Link>
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" /></div> : !result ? (
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-8 text-center text-sm text-slate-500">{error ?? 'Resultaat niet gevonden.'}</Card>
        ) : (
          <>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#0B1B3B]">{result.exam.title}</h2>
                  <div className="mt-1 text-sm text-slate-500">{result.user.name ?? result.user.email}</div>
                </div>
                <Badge className={result.passed ? 'border-0 bg-[#ECFDF3] text-[#16A34A]' : 'border-0 bg-[#FEF2F2] text-[#EF4444]'}>
                  {Math.round(result.score * 100)}%
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Metric label="Goed" value={result.correctCount} />
                <Metric label="Fout" value={result.totalQuestions - result.correctCount} />
                <Metric label="Tijd" value={`${Math.round(result.durationSec / 60)} min`} />
              </div>
            </Card>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="font-display text-lg font-bold text-[#0B1B3B]">Antwoorden</div>
              <div className="mt-4 space-y-4">
                {result.answers.map((answer, index) => (
                  <div key={answer.id} className="rounded-2xl border border-[#E4E7EE] p-4">
                    <div className="text-xs font-semibold text-slate-500">Vraag {index + 1} - {answer.question.topic.name}</div>
                    <div className="mt-2 font-semibold text-[#0B1B3B]">{answer.question.stem}</div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {answer.question.options.map((option) => (
                        <div key={option.key} className={`rounded-xl border p-3 text-sm ${option.isCorrect ? 'border-[#16A34A] bg-[#ECFDF3]' : 'border-[#E4E7EE]'}`}>
                          {option.key}. {option.text}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-slate-600">Gekozen: {answer.selectedKeys}</div>
                    <div className="mt-1 text-sm text-slate-600">{answer.question.explanation}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#F4F7FB] p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-[#0B1B3B]">{value}</div>
    </div>
  )
}
