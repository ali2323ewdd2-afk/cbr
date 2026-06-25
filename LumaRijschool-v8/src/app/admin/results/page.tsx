'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface ResultRow {
  id: string
  score: number
  correctCount: number
  totalQuestions: number
  durationSec: number
  passed: boolean
  finishedAt: string | null
  user: { name: string | null; email: string }
  exam: { title: string }
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/results?search=${encodeURIComponent(search)}&pageSize=50`)
      const data = (await res.json()) as { results?: ResultRow[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Laden mislukt')
      setResults(data.results ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Laden mislukt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function remove(id: string) {
    if (!window.confirm('Resultaat verwijderen?')) return
    const res = await fetch(`/api/admin/results?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Resultaat verwijderd')
      await load()
    } else {
      toast.error('Verwijderen mislukt')
    }
  }

  return (
    <AdminShell title="Results">
      <div className="space-y-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display text-xl font-bold text-[#0B1B3B]">Results</div>
          <div className="text-sm text-slate-500">Bekijk scores, juiste/foute antwoorden, duur en resultaatdetails.</div>
          <div className="mt-4 flex gap-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek student of examen" className="max-w-md rounded-xl" />
            <Button onClick={() => void load()} className="rounded-xl bg-blue-gradient text-white">Zoeken</Button>
          </div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div> : error ? (
            <div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error}</div>
          ) : results.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">Geen resultaten gevonden.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#E4E7EE] text-left">
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Student</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Examen</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Score</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Goed/Fout</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Tijd</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Acties</th>
                </tr></thead>
                <tbody>{results.map((result) => (
                  <tr key={result.id} className="border-b border-[#E4E7EE]/60 last:border-0">
                    <td className="py-3 text-sm font-semibold text-[#0B1B3B]">{result.user.name ?? result.user.email}</td>
                    <td className="py-3 text-sm"><Link href={`/admin/results/${result.id}`} className="font-semibold text-[#2563EB] hover:underline">{result.exam.title}</Link></td>
                    <td className="py-3"><Badge className={result.passed ? 'border-0 bg-[#ECFDF3] text-[#16A34A]' : 'border-0 bg-[#FEF2F2] text-[#EF4444]'}>{Math.round(result.score * 100)}%</Badge></td>
                    <td className="py-3 text-sm">{result.correctCount} / {result.totalQuestions - result.correctCount}</td>
                    <td className="py-3 text-sm">{Math.round(result.durationSec / 60)} min</td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="ghost" className="rounded-xl text-[#EF4444]" onClick={() => void remove(result.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  )
}
