'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  ChevronLeft, Play, Pause, Clock, Lock, Sparkles, BookOpen,
  FileText, ListChecks, Send, Check, Loader2,
} from 'lucide-react'
import { LumaLogo } from '@/components/luma/logo'

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [notes, setNotes] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)

  useEffect(() => {
    fetch(`/api/lessons/${params.id}`)
      .then(async (r) => {
        if (r.status === 402) {
          setLocked(true)
          setLoading(false)
          return
        }
        const d = await r.json()
        setLesson(d.lesson)
        setNotes(d.lesson?.progress?.[0]?.notesPrivate ?? '')
        setLoading(false)
      })
  }, [params.id])

  async function markComplete() {
    setMarkingComplete(true)
    await fetch(`/api/lessons/${params.id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', watchSec: lesson.durationSec }),
    })
    setMarkingComplete(false)
    toast.success('Les voltooid! +30 XP verdiend 🎉')
    setLesson({ ...lesson, progress: [{ status: 'COMPLETED' }] })
  }

  async function saveNotes() {
    await fetch(`/api/lessons/${params.id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notesPrivate: notes }),
    })
    toast.success('Notities opgeslagen')
  }

  async function askAi() {
    if (!aiInput.trim()) return
    setAiLoading(true)
    setAiReply(null)
    const res = await fetch('/api/ai-explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: params.id, text: aiInput }),
    })
    const data = await res.json()
    setAiReply(data.reply)
    setAiLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    )
  }

  if (locked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <Card className="max-w-md rounded-3xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#FEF2F2] text-[#EF4444] mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-[#0B1B3B] mb-2">Abonnement nodig</h1>
          <p className="text-sm text-slate-600 mb-5">Deze les is onderdeel van het premium pakket. Neem een abonnement voor volledige toegang.</p>
          <Button onClick={() => router.push('/#pricing')} className="bg-blue-gradient text-white rounded-xl h-11">Bekijk abonnementen</Button>
        </Card>
      </div>
    )
  }

  if (!lesson) return null

  const completed = lesson.progress?.[0]?.status === 'COMPLETED'
  const related = lesson.topic?.lessons ?? []

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EE] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/lessons" className="text-slate-600 hover:text-[#0B1B3B]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-sm text-slate-500 hidden sm:block">
            Lessen › <span className="font-semibold text-[#0B1B3B]">{lesson.topic.name}</span> ›
          </div>
          <h1 className="font-display font-bold text-base text-[#0B1B3B]">{lesson.title}</h1>
        </div>
        <Link href="/dashboard"><LumaLogo size={32} /></Link>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid lg:grid-cols-3 gap-6">
        {/* Main: video + tabs */}
        <div className="lg:col-span-2">
          {/* Video player */}
          <Card className="rounded-3xl overflow-hidden border-[#E4E7EE] shadow-card">
            <div className="aspect-video bg-black relative">
              {lesson.videoUrl?.includes('youtube') || lesson.videoUrl?.includes('youtu.be') ? (
                <iframe
                  src={lesson.videoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={lesson.videoUrl} className="w-full h-full" controls />
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-[#0B1B3B]">{lesson.title}</h1>
                  <div className="text-sm text-slate-500 mt-1">{lesson.topic.name} · {Math.floor(lesson.durationSec / 60)}:{String(lesson.durationSec % 60).padStart(2, '0')}</div>
                </div>
                <Button
                  onClick={markComplete}
                  disabled={markingComplete || completed}
                  className={completed ? 'bg-[#ECFDF3] text-[#16A34A] hover:bg-[#DCFCE7]' : 'bg-blue-gradient text-white shadow-luma-soft hover:opacity-90'}
                >
                  {completed ? <><Check className="w-4 h-4 mr-1.5" /> Voltooid</> : markingComplete ? 'Bezig...' : 'Markeer als voltooid'}
                </Button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{lesson.description}</p>
            </div>
          </Card>

          {/* Tabs */}
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card mt-5 p-5">
            <Tabs defaultValue="description">
              <TabsList className="bg-[#F4F7FB] rounded-xl p-1">
                <TabsTrigger value="description" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><BookOpen className="w-4 h-4 mr-1.5" /> Beschrijving</TabsTrigger>
                <TabsTrigger value="transcript" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><FileText className="w-4 h-4 mr-1.5" /> Transcript</TabsTrigger>
                <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><ListChecks className="w-4 h-4 mr-1.5" /> Notities</TabsTrigger>
                <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><Sparkles className="w-4 h-4 mr-1.5" /> AI uitleg</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {lesson.notes || lesson.description}
              </TabsContent>
              <TabsContent value="transcript" className="mt-5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {lesson.transcript || 'Geen transcript beschikbaar.'}
              </TabsContent>
              <TabsContent value="notes" className="mt-5 space-y-3">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6}
                  placeholder="Schrijf hier je notities..." className="rounded-xl" />
                <Button onClick={saveNotes} className="bg-blue-gradient text-white rounded-xl h-10">Opslaan</Button>
              </TabsContent>
              <TabsContent value="ai" className="mt-5 space-y-3">
                <div className="rounded-2xl bg-gradient-to-br from-[#F3EEFF] to-[#EFF6FF] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#5C8BFF] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#0B1B3B]">Leg dit uit met AI</div>
                      <div className="text-xs text-slate-500">Vraag alles over deze les</div>
                    </div>
                  </div>
                  <Textarea value={aiInput} onChange={(e) => setAiInput(e.target.value)} rows={3}
                    placeholder="Bijv: Waarom moet ik aan de rechterkant stoppen bij een stopbord?" className="rounded-xl" />
                  <Button onClick={askAi} disabled={aiLoading} className="mt-2 bg-gradient-to-r from-[#7C5CFC] to-[#5C8BFF] text-white rounded-xl h-10">
                    {aiLoading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Denkt na...</> : <><Send className="w-4 h-4 mr-1.5" /> Vraag AI</>}
                  </Button>
                </div>
                {aiReply && (
                  <div className="rounded-2xl bg-white border border-[#E4E7EE] p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {aiReply}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right rail: chapter + related */}
        <div className="lg:col-span-1">
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-5 mb-5">
            <div className="font-display font-bold text-base text-[#0B1B3B] mb-3">Hoofdstuk: {lesson.topic.name}</div>
            <div className="space-y-2">
              {lesson.chapters?.map((c: any, i: number) => (
                <div key={c.id} className="rounded-xl p-3 hover:bg-[#F4F7FB] cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-bold text-xs flex items-center justify-center">{i + 1}</div>
                    <div className="text-sm font-semibold text-[#0B1B3B]">{c.title}</div>
                  </div>
                  <div className="text-xs text-slate-400">{Math.floor(c.startSec / 60)}:{String(c.startSec % 60).padStart(2, '0')}</div>
                </div>
              ))}
              {lesson.questions?.length > 0 && (
                <Link href="/exams" className="block rounded-xl p-3 bg-[#F4F7FB] hover:bg-[#EFF6FF]">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#FFB020] text-white font-bold text-xs flex items-center justify-center">Q</div>
                    <div className="text-sm font-semibold text-[#0B1B3B]">Mini-quiz ({lesson.questions.length} vragen)</div>
                  </div>
                </Link>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-5">
            <div className="font-display font-bold text-base text-[#0B1B3B] mb-3">Volgende in dit hoofdstuk</div>
            <div className="space-y-2">
              {related.filter((r: any) => r.id !== lesson.id).slice(0, 4).map((r: any) => (
                <Link key={r.id} href={`/lessons/${r.id}`} className="block rounded-xl p-3 hover:bg-[#F4F7FB] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: r.topic?.color + '20' }}>
                      <Play className="w-4 h-4" style={{ color: r.topic?.color }} fill={r.topic?.color} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0B1B3B] line-clamp-1">{r.title}</div>
                      <div className="text-xs text-slate-500">{Math.floor(r.durationSec / 60)} min</div>
                    </div>
                  </div>
                </Link>
              ))}
              {related.filter((r: any) => r.id !== lesson.id).length === 0 && (
                <div className="text-xs text-slate-500">Geen andere lessen in dit hoofdstuk.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
