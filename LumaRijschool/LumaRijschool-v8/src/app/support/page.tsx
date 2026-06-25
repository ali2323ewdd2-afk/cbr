'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus, MessageSquare, Clock, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', body: '', category: 'GENERAL', priority: 'NORMAL' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/support').then((r) => r.json()).then((d) => {
      setTickets(d.tickets || [])
      setLoading(false)
    })
  }, [])

  async function submit() {
    if (!form.subject || !form.body) {
      toast.error('Vul onderwerp en bericht in')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/support', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Ticket aangemaakt!')
      setShowForm(false)
      setForm({ subject: '', body: '', category: 'GENERAL', priority: 'NORMAL' })
      fetch('/api/support').then((r) => r.json()).then((d) => setTickets(d.tickets || []))
    } else {
      toast.error('Aanmaken mislukt')
    }
  }

  return (
    <AppShell title="Support">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0B1B3B]">Support Tickets</h2>
          <p className="text-sm text-slate-500 mt-1">Heb je een vraag? Ons team helpt je graag.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-gradient text-white rounded-xl">
          <Plus className="w-4 h-4 mr-1.5" /> Nieuw ticket
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Onderwerp</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-xl mt-1.5" placeholder="Korte beschrijving van je vraag" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Categorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Algemeen</SelectItem>
                    <SelectItem value="PAYMENT">Betaling</SelectItem>
                    <SelectItem value="TECHNICAL">Technisch</SelectItem>
                    <SelectItem value="CONTENT">Inhoud</SelectItem>
                    <SelectItem value="ACCOUNT">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Prioriteit</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Laag</SelectItem>
                    <SelectItem value="NORMAL">Normaal</SelectItem>
                    <SelectItem value="HIGH">Hoog</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Bericht</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} className="rounded-xl mt-1.5" placeholder="Beschrijf je vraag of probleem..." />
            </div>
            <Button onClick={submit} disabled={submitting} className="bg-blue-gradient text-white rounded-xl h-11">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ticket aanmaken'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <div className="text-sm text-slate-500">Nog geen tickets. Stel je vraag via "Nieuw ticket".</div>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <Link key={t.id} href={`/support/${t.id}`} className="block rounded-2xl p-4 hover:bg-[#F4F7FB] transition border border-[#E4E7EE]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`border-0 text-xs ${t.status === 'OPEN' ? 'bg-[#EFF6FF] text-[#2563EB]' : t.status === 'ANSWERED' ? 'bg-[#FFB020]/20 text-[#B45309]' : t.status === 'RESOLVED' ? 'bg-[#ECFDF3] text-[#16A34A]' : 'bg-[#F4F7FB] text-slate-500'}`}>
                        {t.status === 'OPEN' ? 'Open' : t.status === 'ANSWERED' ? 'Beantwoord' : t.status === 'RESOLVED' ? 'Opgelost' : 'Gesloten'}
                      </Badge>
                      <span className="text-xs text-slate-500">#{t.id.slice(-6)}</span>
                    </div>
                    <div className="font-semibold text-sm text-[#0B1B3B]">{t.subject}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{t.body}</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div className="flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {new Date(t.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</div>
                    <div className="mt-1">{t._count?.replies || 0} reacties</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  )
}
