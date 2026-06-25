'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Globe, Smartphone, Monitor, Clock } from 'lucide-react'

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/guests').then((r) => r.json()).then((d) => {
      setGuests(d.guests || [])
      setLoading(false)
    })
  }, [])

  return (
    <AdminShell title="Gasten">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display font-bold text-lg text-[#0B1B3B]">Gasten tracking</div>
            <div className="text-xs text-slate-500">{guests.length} gasten (laatste 100)</div>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E4E7EE] text-left">
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">IP</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Device</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Browser</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Pages</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 hidden md:table-cell">Lessons</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 hidden md:table-cell">Exams</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Converted</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Eerst gezien</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => {
                  const lessons = typeof g.lessonsViewed === 'string' ? JSON.parse(g.lessonsViewed || '[]').length : g.lessonsViewed?.length || 0
                  const exams = typeof g.examsStarted === 'string' ? JSON.parse(g.examsStarted || '[]').length : g.examsStarted?.length || 0
                  return (
                    <tr key={g.id} className="border-b border-[#E4E7EE]/50 last:border-0 hover:bg-[#F4F7FB]">
                      <td className="py-3 text-sm font-mono text-slate-700">{g.ip}</td>
                      <td className="py-3 text-sm">
                        <span className="inline-flex items-center gap-1">
                          {g.device === 'Mobiel' ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                          {g.device}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-600">{g.browser}</td>
                      <td className="py-3 text-sm text-slate-600">{g.pagesVisited}</td>
                      <td className="py-3 text-sm text-slate-600 hidden md:table-cell">{lessons}</td>
                      <td className="py-3 text-sm text-slate-600 hidden md:table-cell">{exams}</td>
                      <td className="py-3">
                        {g.converted ? <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Ja</Badge> : <Badge className="bg-[#F4F7FB] text-slate-500 hover:bg-[#F4F7FB] border-0">Nee</Badge>}
                      </td>
                      <td className="py-3 text-xs text-slate-500 text-right">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(g.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
