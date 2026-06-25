'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Lock, Play, Clock } from 'lucide-react'

interface LessonsResponse {
  lessons: Array<{
    id: string; slug: string; title: string; summary: string; durationSec: number
    isFree: boolean; order: number
    topic: { id: string; name: string; color: string }
    progress: Array<{ status: string }>
    _count: { questions: number }
  }>
}

export default function LessonsPage() {
  const [data, setData] = useState<LessonsResponse | null>(null)
  const [activeTopic, setActiveTopic] = useState<string>('all')

  useEffect(() => {
    fetch('/api/lessons').then((r) => r.json()).then(setData)
  }, [])

  const topics = data?.lessons
    ? Array.from(new Set(data.lessons.map((l) => l.topic.id))).map((id) => data.lessons.find((l) => l.topic.id === id)!.topic)
    : []

  const filtered = data?.lessons.filter((l) => activeTopic === 'all' || l.topic.id === activeTopic) ?? []

  return (
    <AppShell title="Lessen">
      {/* Topic filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setActiveTopic('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTopic === 'all' ? 'bg-blue-gradient text-white shadow-luma-soft' : 'bg-white border border-[#E4E7EE] text-slate-600 hover:border-slate-300'}`}
        >
          Alle onderwerpen
        </button>
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTopic(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTopic === t.id ? 'text-white shadow-luma-soft' : 'bg-white border border-[#E4E7EE] text-slate-600 hover:border-slate-300'}`}
            style={activeTopic === t.id ? { backgroundColor: t.color } : {}}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Lessons grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((l) => {
          const completed = l.progress[0]?.status === 'COMPLETED'
          const inProgress = l.progress[0]?.status === 'IN_PROGRESS'
          return (
            <Card key={l.id} className="rounded-3xl border-[#E4E7EE] shadow-card overflow-hidden hover:shadow-luma-soft transition-all duration-300 hover:-translate-y-1">
              {/* Thumbnail */}
              <div className="aspect-video relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${l.topic.color}25, ${l.topic.color}10)` }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white shadow-luma-soft flex items-center justify-center">
                    <Play className="w-6 h-6 ml-0.5" style={{ color: l.topic.color }} fill={l.topic.color} />
                  </div>
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-white/90 text-[#0B1B3B] hover:bg-white border-0 text-xs">{l.topic.name}</Badge>
                  {l.isFree && <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0 text-xs">Gratis</Badge>}
                </div>
                <div className="absolute top-3 right-3">
                  {completed ? (
                    <div className="w-8 h-8 rounded-full bg-[#1FB871] flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
                  ) : !l.isFree ? (
                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"><Lock className="w-4 h-4 text-slate-600" /></div>
                  ) : null}
                </div>
                <div className="absolute bottom-3 right-3">
                  <Badge className="bg-black/60 text-white hover:bg-black/60 border-0 text-xs">
                    <Clock className="w-3 h-3 mr-1" /> {Math.floor(l.durationSec / 60)}:{String(l.durationSec % 60).padStart(2, '0')}
                  </Badge>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display font-bold text-lg text-[#0B1B3B] mb-1.5">{l.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-4">{l.summary}</p>
                <Link href={`/lessons/${l.id}`}>
                  <Button className={`w-full rounded-xl h-10 ${completed ? 'bg-[#ECFDF3] text-[#16A34A] hover:bg-[#DCFCE7]' : inProgress ? 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]' : 'bg-blue-gradient text-white shadow-luma-soft hover:opacity-90'}`}>
                    {completed ? 'Opnieuw bekijken' : inProgress ? 'Verder gaan' : 'Start les'}
                  </Button>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="rounded-3xl p-10 text-center">
          <div className="text-4xl mb-3">📚</div>
          <div className="font-display font-bold text-lg text-[#0B1B3B]">Geen lessen gevonden</div>
          <div className="text-sm text-slate-500 mt-1">Probeer een ander onderwerp.</div>
        </Card>
      )}
    </AppShell>
  )
}
