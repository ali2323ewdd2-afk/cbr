'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Sparkles, Loader2, MessageCircle, Plus, Bot, User } from 'lucide-react'

interface Msg { role: 'user' | 'assistant' | 'system'; content: string; createdAt?: string }

const SUGGESTIONS = [
  'Leg voorrang uit bij een gelijkwaardige kruising',
  'Wat betekent een stopbord?',
  'Maak een korte oefening over voorrang',
  'Wat is het verschil tussen parkeren en stilstaan?',
  'Hoe voeg ik veilig in op de snelweg?',
]

export default function TutorPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: 'Hoi! Ik ben Luma AI Tutor. Stel je vraag over de theorie en ik leg het duidelijk uit. Bijv: "Wat betekent dit bord?" of "Leg voorrang uit bij een rotonde."',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [needsSub, setNeedsSub] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tutor').then((r) => r.json()).then((d) => {
      setSessions(d.sessions || [])
    })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setLoading(true)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content }])
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, sessionId }),
      })
      if (res.status === 402) {
        setNeedsSub(true)
        setLoading(false)
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'AI Tutor vereist een actief abonnement. Neem het Month-abonnement voor onbeperkte toegang. 🚗' },
        ])
        return
      }
      const data = await res.json()
      if (data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId)
          // Refresh sessions list
          fetch('/api/tutor').then((r) => r.json()).then((d) => setSessions(d.sessions || []))
        }
      }
    } catch (e) {
      toast.error('Verbinding mislukt. Probeer opnieuw.')
    }
    setLoading(false)
  }

  function startNewSession() {
    setSessionId(null)
    setMessages([{ role: 'assistant', content: 'Nieuwe sessie gestart. Stel je vraag!' }])
  }

  return (
    <AppShell title="AI Tutor">
      <div className="grid lg:grid-cols-4 gap-5 h-[calc(100vh-7rem)]">
        {/* Sessions sidebar */}
        <Card className="hidden lg:block rounded-3xl border-[#E4E7EE] shadow-card p-4 lg:col-span-1 overflow-y-auto">
          <Button onClick={startNewSession} variant="outline" className="w-full rounded-xl h-10 border-[#E4E7EE] mb-3">
            <Plus className="w-4 h-4 mr-1.5" /> Nieuwe sessie
          </Button>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-2">Geschiedenis</div>
          <div className="space-y-1">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSessionId(s.id)
                  fetch(`/api/tutor/sessions/${s.id}`).then((r) => r.json()).then((d) => {
                    setMessages(d.session.messages.map((m: any) => ({ role: m.role.toLowerCase(), content: m.content, createdAt: m.createdAt })))
                  })
                }}
                className={`w-full text-left rounded-xl p-2.5 text-sm transition ${sessionId === s.id ? 'bg-[#EFF6FF] text-[#2563EB]' : 'hover:bg-[#F4F7FB] text-slate-700'}`}
              >
                <div className="font-semibold line-clamp-1">{s.title}</div>
                <div className="text-xs text-slate-400">{new Date(s.updatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} · {s._count.messages} berichten</div>
              </button>
            ))}
            {sessions.length === 0 && <div className="text-xs text-slate-400 px-2">Nog geen sessies</div>}
          </div>
        </Card>

        {/* Chat panel */}
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card flex flex-col lg:col-span-3 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#E4E7EE] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#5C8BFF] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-display font-bold text-base text-[#0B1B3B]">Luma AI Tutor</div>
                <div className="text-xs text-[#1FB871] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1FB871] animate-pulse-soft" /> Online · antwoordt direct
                </div>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-[#7C5CFC] to-[#5C8BFF] text-white hover:opacity-90 border-0">AI Powered</Badge>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F4F7FB]">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role !== 'user' && (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#5C8BFF] flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-gradient text-white rounded-tr-sm'
                      : 'bg-white border border-[#E4E7EE] text-[#0B1B3B] rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-9 h-9 rounded-xl bg-[#0B1B3B] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#5C8BFF] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border border-[#E4E7EE] rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-[#7C5CFC]" />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-5 py-3 border-t border-[#E4E7EE] bg-white">
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Suggesties
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full bg-[#F4F7FB] hover:bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#0B1B3B] transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-[#E4E7EE] bg-white">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={needsSub ? 'Abonnement vereist voor AI Tutor' : 'Stel je vraag aan Luma…'}
                disabled={needsSub}
                rows={1}
                className="rounded-xl resize-none min-h-[44px] max-h-32"
              />
              <Button onClick={() => send()} disabled={loading || !input.trim() || needsSub} className="bg-gradient-to-r from-[#7C5CFC] to-[#5C8BFF] text-white rounded-xl h-11 px-4">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
