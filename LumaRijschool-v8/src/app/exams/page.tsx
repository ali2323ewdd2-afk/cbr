'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, FileText, Lock, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/exams').then((r) => r.json()).then((d) => {
      setExams(d.exams || [])
      setLoading(false)
    })
  }, [])

  return (
    <AppShell title="Examens">
      <div className="rounded-3xl bg-navy-gradient p-6 md:p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#5C8BFF]/30 blur-3xl" />
        <div className="relative">
          <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 mb-3">CBR-stijl</Badge>
          <h2 className="font-display font-extrabold text-3xl text-balance">Oefen met examens die exact lijken op het CBR</h2>
          <p className="text-slate-300 mt-2 max-w-2xl">40 vragen · 45 minuten · 87,5% slagingsgrens. Net als het echte examen.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.map((e) => {
          const attempt = e.attempts?.[0]
          return (
            <Card key={e.id} className="rounded-3xl border-[#E4E7EE] shadow-card overflow-hidden hover:shadow-luma-soft transition-all duration-300 hover:-translate-y-1">
              <div className="aspect-[5/3] bg-navy-gradient relative flex items-center justify-center">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 0%, transparent 50%)' }} />
                <div className="text-center text-white relative">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-90" />
                  <div className="font-display font-extrabold text-2xl">{e.questionCount}</div>
                  <div className="text-xs text-slate-300">vragen</div>
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  {e.isFree ? <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Gratis</Badge> : <Badge className="bg-[#FFB020] text-white hover:bg-[#FFB020] border-0">Premium</Badge>}
                  {attempt?.passed && <Badge className="bg-[#1FB871] text-white hover:bg-[#1FB871] border-0"><Trophy className="w-3 h-3 mr-1" /> Geslaagd</Badge>}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display font-bold text-lg text-[#0B1B3B] mb-1">{e.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">{e.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {Math.floor(e.durationSec / 60)} min</span>
                  <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {e.questionCount} vragen</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {Math.round(e.passingScore * 100)}% slagen</span>
                </div>
                <Link href={`/exams/${e.id}`}>
                  <Button className="w-full bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl h-11">
                    {attempt ? 'Opnieuw proberen' : 'Start examen'} <ArrowRight className="ml-1.5 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>

      {!loading && exams.length === 0 && (
        <Card className="rounded-3xl p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-display font-bold text-lg text-[#0B1B3B]">Geen examens beschikbaar</div>
          <div className="text-sm text-slate-500 mt-1">Neem een abonnement voor toegang tot alle examens.</div>
          <Link href="/#pricing"><Button className="mt-4 bg-blue-gradient text-white rounded-xl h-11">Bekijk abonnementen</Button></Link>
        </Card>
      )}
    </AppShell>
  )
}
