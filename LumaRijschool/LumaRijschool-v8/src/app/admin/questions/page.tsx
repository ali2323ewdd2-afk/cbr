'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/questions').then((r) => r.json()).then((d) => {
      setQuestions(d.questions || [])
      setLoading(false)
    })
  }, [])

  return (
    <AdminShell title="Vragenbeheer">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display font-bold text-lg text-[#0B1B3B]">Vragen bank</div>
                <div className="text-xs text-slate-500">{questions.length} vragen geladen</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E4E7EE] text-left">
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Vraag</th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Onderwerp</th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Moeilijkheid</th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Gebruik</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b border-[#E4E7EE]/50 last:border-0 hover:bg-[#F4F7FB]">
                      <td className="py-3 max-w-md">
                        <div className="text-sm text-[#0B1B3B] line-clamp-1">{q.stem}</div>
                      </td>
                      <td className="py-3">
                        <Badge className="border-0 text-white" style={{ backgroundColor: q.topic.color }}>{q.topic.name}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={`border-0 ${
                          q.difficulty === 'EASY' ? 'bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3]' :
                          q.difficulty === 'HARD' ? 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]' :
                          'bg-[#FFB020]/10 text-[#B45309] hover:bg-[#FFB020]/10'
                        }`}>{q.difficulty}</Badge>
                      </td>
                      <td className="py-3 text-right text-sm text-slate-600">{q._count.answers}× beantwoord</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </AdminShell>
  )
}
