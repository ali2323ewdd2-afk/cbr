'use client'

import { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface NotificationRow {
  id: string
  title: string
  body: string
  channel: string
  sentAt: string | null
  createdAt: string
  user: { name: string | null; email: string }
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ audience: 'ALL', userId: '', title: '', body: '', link: '', email: false, push: false })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/notifications?pageSize=25')
    const data = (await res.json()) as { notifications?: NotificationRow[] }
    setNotifications(data.notifications ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function send() {
    if (!form.title || !form.body) {
      toast.error('Titel en bericht zijn verplicht')
      return
    }
    const channels = ['IN_APP', ...(form.email ? ['EMAIL'] : []), ...(form.push ? ['PUSH'] : [])]
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience: form.audience, userId: form.userId || undefined, title: form.title, body: form.body, link: form.link || undefined, channels }),
    })
    if (res.ok) {
      toast.success('Notificatie verzonden')
      setForm({ audience: 'ALL', userId: '', title: '', body: '', link: '', email: false, push: false })
      await load()
    } else {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? 'Verzenden mislukt')
    }
  }

  return (
    <AdminShell title="Notifications">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display text-xl font-bold text-[#0B1B3B]">Notificatie sturen</div>
          <div className="mt-5 space-y-3">
            <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="ALL">Iedereen</option>
              <option value="USER">Specifieke gebruiker</option>
            </select>
            {form.audience === 'USER' ? <Input value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} placeholder="User ID" className="rounded-xl" /> : null}
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Titel" className="rounded-xl" />
            <Textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Bericht" className="rounded-xl" />
            <Input value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="/dashboard" className="rounded-xl" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.email} onChange={(event) => setForm({ ...form, email: event.target.checked })} /> Email notification</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.push} onChange={(event) => setForm({ ...form, push: event.target.checked })} /> Push notification</label>
            <Button onClick={() => void send()} className="rounded-xl bg-blue-gradient text-white"><Bell className="mr-2 h-4 w-4" />Verzenden</Button>
          </div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display text-lg font-bold text-[#0B1B3B]">Verzonden notificaties</div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div> : notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Nog geen notificaties.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-[#E4E7EE] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-[#0B1B3B]">{notification.title}</div>
                    <Badge className="border-0 bg-slate-100 text-slate-700">{notification.channel}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{notification.body}</div>
                  <div className="mt-2 text-xs text-slate-500">{notification.user.name ?? notification.user.email} - {new Date(notification.createdAt).toLocaleString('nl-NL')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  )
}
