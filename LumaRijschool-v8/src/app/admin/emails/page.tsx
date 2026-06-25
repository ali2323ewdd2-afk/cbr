'use client'

import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface EmailLog {
  id: string
  audience: string
  subject: string
  status: string
  sentCount: number
  createdAt: string
}

export default function AdminEmailsPage() {
  const [history, setHistory] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ audience: 'TEST', userId: '', testEmail: '', subject: '', html: '' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/emails?pageSize=25')
    const data = (await res.json()) as { emails?: EmailLog[] }
    setHistory(data.emails ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function send() {
    if (!form.subject || !form.html) {
      toast.error('Subject en HTML zijn verplicht')
      return
    }
    if ((form.audience === 'ALL' || form.audience === 'SUBSCRIBERS') && !window.confirm(`Email verzenden naar ${form.audience === 'ALL' ? 'iedereen' : 'alle abonnees'}?`)) return
    setSending(true)
    const res = await fetch('/api/admin/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Email verwerkt')
      setForm({ audience: 'TEST', userId: '', testEmail: '', subject: '', html: '' })
      await load()
    } else {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? 'Verzenden mislukt')
    }
    setSending(false)
  }

  return (
    <AdminShell title="Emails">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display text-xl font-bold text-[#0B1B3B]">Email verzenden</div>
          <div className="text-sm text-slate-500">Verstuur naar iedereen, abonnees, één gebruiker of testadres.</div>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Audience</Label>
              <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                <option value="TEST">Test email</option>
                <option value="USER">Gebruiker</option>
                <option value="SUBSCRIBERS">Abonnees</option>
                <option value="ALL">Iedereen</option>
              </select>
            </div>
            {form.audience === 'USER' ? <Input value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} placeholder="User ID" className="rounded-xl" /> : null}
            {form.audience === 'TEST' ? <Input value={form.testEmail} onChange={(event) => setForm({ ...form, testEmail: event.target.value })} placeholder="test@example.com" className="rounded-xl" /> : null}
            <Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Subject" className="rounded-xl" />
            <Textarea value={form.html} onChange={(event) => setForm({ ...form, html: event.target.value })} placeholder="<h1>Preview HTML</h1>" rows={8} className="rounded-xl" />
            <div className="rounded-2xl border border-[#E4E7EE] bg-white p-4">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Preview</div>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: form.html }} />
            </div>
            <Button onClick={() => void send()} disabled={sending} className="rounded-xl bg-blue-gradient text-white">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Verzenden
            </Button>
          </div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display text-lg font-bold text-[#0B1B3B]">History</div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div> : history.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Nog geen emails verstuurd.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {history.map((email) => (
                <div key={email.id} className="rounded-2xl border border-[#E4E7EE] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-[#0B1B3B]">{email.subject}</div>
                    <Badge className="border-0 bg-slate-100 text-slate-700">{email.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{email.audience} - {email.sentCount} ontvangers - {new Date(email.createdAt).toLocaleString('nl-NL')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  )
}
