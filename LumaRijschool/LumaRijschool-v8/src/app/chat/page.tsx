'use client'

import { useEffect, useState, useRef } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Loader2, Bot, MessageSquare, Plus, Users } from 'lucide-react'

interface Message { id: string; body: string; authorType: string; userId?: string | null; fileUrl?: string | null; fileName?: string | null; createdAt: string }

export default function ChatPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [activeRoom, setActiveRoom] = useState<any | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/chat').then((r) => r.json()).then((d) => {
      setRooms(d.rooms || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (activeRoom) {
      fetch(`/api/chat/${activeRoom.id}`).then((r) => r.json()).then((d) => {
        setMessages(d.messages || [])
      })
    }
  }, [activeRoom])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function startSupportChat() {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SUPPORT', subject: 'Algemene vraag' }),
    })
    const d = await res.json()
    if (d.room) {
      setRooms([d.room, ...rooms])
      setActiveRoom(d.room)
      setMessages(d.aiMessage ? [d.aiMessage] : [])
    }
  }

  async function send() {
    if (!input.trim() || !activeRoom) return
    setSending(true)
    const res = await fetch('/api/chat/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: activeRoom.id, body: input }),
    })
    const d = await res.json()
    setSending(false)
    if (res.ok) {
      setMessages([...messages, d.message])
      setInput('')
    } else {
      toast.error('Verzenden mislukt')
    }
  }

  if (loading) return <AppShell title="Chat"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AppShell>

  return (
    <AppShell title="Live Chat">
      <div className="grid lg:grid-cols-4 gap-5 h-[calc(100vh-7rem)]">
        <Card className="hidden lg:flex flex-col rounded-3xl border-[#E4E7EE] shadow-card p-4 lg:col-span-1">
          <Button onClick={startSupportChat} className="w-full bg-blue-gradient text-white rounded-xl h-10 mb-3">
            <Plus className="w-4 h-4 mr-1.5" /> Nieuwe support chat
          </Button>
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">Chat rooms</div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRoom(r)}
                className={`w-full text-left rounded-xl p-3 text-sm transition ${activeRoom?.id === r.id ? 'bg-[#EFF6FF] text-[#2563EB]' : 'hover:bg-[#F4F7FB]'}`}
              >
                <div className="font-semibold truncate">{r.name || `Chat ${r.id.slice(-6)}`}</div>
                <div className="text-xs text-slate-500 truncate">{r.lastMessage?.body || 'Nog geen berichten'}</div>
              </button>
            ))}
            {rooms.length === 0 && <div className="text-xs text-slate-500 px-2">Nog geen chats</div>}
          </div>
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card flex flex-col lg:col-span-3 overflow-hidden">
          {activeRoom ? (
            <>
              <div className="px-5 py-3 border-b border-[#E4E7EE] flex items-center justify-between">
                <div>
                  <div className="font-display font-bold text-base text-[#0B1B3B]">{activeRoom.name || 'Chat'}</div>
                  <div className="text-xs text-[#1FB871] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1FB871]" /> AI support online
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-[#7C5CFC] to-[#5C8BFF] text-white border-0">AI Powered</Badge>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F4F7FB]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-2 ${m.authorType === 'USER' ? 'justify-end' : ''}`}>
                    {m.authorType !== 'USER' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#5C8BFF] flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.authorType === 'USER' ? 'bg-blue-gradient text-white rounded-tr-sm' : 'bg-white border border-[#E4E7EE] rounded-tl-sm'}`}>
                      {m.body}
                      {m.fileUrl && (
                        <a href={m.fileUrl} target="_blank" className="block mt-1 text-xs underline opacity-80">📎 {m.fileName || 'Bestand'}</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#E4E7EE] bg-white">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Typ je bericht..."
                    rows={1}
                    className="rounded-xl resize-none min-h-[44px] max-h-32"
                  />
                  <Button onClick={send} disabled={sending || !input.trim()} className="bg-blue-gradient text-white rounded-xl h-11 px-4">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
              <MessageSquare className="w-12 h-12 text-slate-400 mb-3" />
              <div className="font-display font-bold text-lg text-[#0B1B3B]">Welkom bij Live Chat</div>
              <p className="text-sm text-slate-500 mt-1 max-w-md">Start een support chat en onze AI beantwoordt direct. Een admin neemt het over als het ingewikkelder is.</p>
              <Button onClick={startSupportChat} className="mt-4 bg-blue-gradient text-white rounded-xl">
                <Plus className="w-4 h-4 mr-1.5" /> Start support chat
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
