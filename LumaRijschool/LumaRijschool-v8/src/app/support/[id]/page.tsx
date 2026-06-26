'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'

function TicketDetail() {
  const params = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/support/${params.id}`).then((r) => r.json()).then((d) => {
      setTicket(d.ticket)
      setLoading(false)
    })
  }, [params.id])

  async function sendReply() {
    if (!reply.trim()) return
    setSending(true)
    const res = await fetch(`/api/support/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply }),
    })
    setSending(false)
    if (res.ok) {
      setReply('')
      toast.success('Reactie verzonden')
      fetch(`/api/support/${params.id}`).then((r) => r.json()).then((d) => setTicket(d.ticket))
    } else {
      toast.error('Verzenden mislukt')
    }
  }

  if (loading) return <AppShell title="Ticket"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AppShell>
  if (!ticket) return null

  return (
    <AppShell title={`Ticket #${ticket.id.slice(-6)}`}>
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={`border-0 text-xs ${ticket.status === 'OPEN' ? 'bg-[#EFF6FF] text-[#2563EB]' : ticket.status === 'ANSWERED' ? 'bg-[#FFB020]/20 text-[#B45309]' : ticket.status === 'RESOLVED' ? 'bg-[#ECFDF3] text-[#16A34A]' : 'bg-[#F4F7FB] text-slate-500'}`}>
            {ticket.status === 'OPEN' ? 'Open' : ticket.status === 'ANSWERED' ? 'Beantwoord' : ticket.status === 'RESOLVED' ? 'Opgelost' : 'Gesloten'}
          </Badge>
          <Badge className="bg-[#F4F7FB] text-slate-600 hover:bg-[#F4F7FB] border-0 text-xs">{ticket.category}</Badge>
          <Badge className="bg-[#F4F7FB] text-slate-600 hover:bg-[#F4F7FB] border-0 text-xs">{ticket.priority}</Badge>
        </div>
        <h1 className="font-display font-extrabold text-xl text-[#0B1B3B]">{ticket.subject}</h1>
        <div className="text-xs text-slate-500 mt-1">{new Date(ticket.createdAt).toLocaleString('nl-NL')}</div>
        <div className="mt-4 rounded-2xl bg-[#F4F7FB] p-4 text-sm text-slate-700 whitespace-pre-wrap">{ticket.body}</div>
      </Card>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Reacties ({ticket.replies.length})</div>
        <div className="space-y-3">
          {ticket.replies.map((r: any) => (
            <div key={r.id} className={`rounded-2xl p-4 ${r.isStaff ? 'bg-[#EFF6FF] border border-[#2563EB]/20' : 'bg-[#F4F7FB]'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm text-[#0B1B3B]">{r.user.name} {r.isStaff && <Badge className="bg-[#2563EB] text-white hover:bg-[#2563EB] border-0 text-xs ml-1">Support</Badge>}</div>
                <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString('nl-NL')}</div>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{r.body}</div>
            </div>
          ))}
          {ticket.replies.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Nog geen reacties</div>}
        </div>
      </Card>

      {ticket.status !== 'CLOSED' && (
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-3">Reageer</div>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} className="rounded-xl" placeholder="Typ je reactie..." />
          <Button onClick={sendReply} disabled={sending || !reply.trim()} className="mt-3 bg-blue-gradient text-white rounded-xl h-11">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" /> Verstuur</>}
          </Button>
        </Card>
      )}
    </AppShell>
  )
}

export default function Page() {
  return <Suspense fallback={null}><TicketDetail /></Suspense>
}
