'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface ExamDetail {
  exam: {
    id: string
    title: string
    description: string
    type: string
    durationSec: number
    passingScore: number
    questions: {
      id: string
      order: number
      question: {
        id: string
        stem: string
        explanation: string
        difficulty: string
        topic: { name: string; color: string }
        options: { key: string; text: string; isCorrect: boolean }[]
      }
    }[]
  }
  stats: {
    attempts: number
    passRate: number
    averageScore: number
    averageDurationSec: number
  }
}

export default function AdminExamDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<ExamDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/exams/${params.id}`).then((res) => res.json()).then((body: ExamDetail) => {
      setData(body)
      setLoading(false)
    })
  }, [params.id])

  return (
    <AdminShell title="Exam preview">
      <div className="space-y-5">
        <Link href="/admin/exams" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B]">
          <ArrowLeft className="h-4 w-4" /> Terug naar examens
        </Link>
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" /></div> : !data ? (
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-8 text-center text-sm text-slate-500">Examen niet gevonden.</Card>
        ) : (
          <>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#0B1B3B]">{data.exam.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{data.exam.description}</p>
                </div>
                <Badge className="border-0 bg-[#EFF6FF] text-[#2563EB]">{data.exam.type}</Badge>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Metric label="Attempts" value={data.stats.attempts} />
                <Metric label="Pass rate" value={`${Math.round(data.stats.passRate * 100)}%`} />
                <Metric label="Avg score" value={`${Math.round(data.stats.averageScore * 100)}%`} />
                <Metric label="Avg time" value={`${Math.round(data.stats.averageDurationSec / 60)} min`} />
              </div>
            </Card>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="font-display text-lg font-bold text-[#0B1B3B]">Preview questions</div>
              <div className="mt-4 space-y-4">
                {data.exam.questions.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">Geen vragen gekoppeld.</div> : data.exam.questions.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-[#E4E7EE] p-4">
                    <div className="text-xs font-semibold text-slate-500">Vraag {index + 1} - {item.question.topic.name} - {item.question.difficulty}</div>
                    <div className="mt-2 font-semibold text-[#0B1B3B]">{item.question.stem}</div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {item.question.options.map((option) => (
                        <div key={option.key} className={`rounded-xl border p-3 text-sm ${option.isCorrect ? 'border-[#16A34A] bg-[#ECFDF3]' : 'border-[#E4E7EE]'}`}>{option.key}. {option.text}</div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-slate-600">{item.question.explanation}</div>
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
