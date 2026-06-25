'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Bell, X } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', type: 'INFO', audience: 'ALL' })

  useEffect(() => {
    fetch('/api/admin/announcements').then((r) => r.json()).then((d) => {
      setItems(d.announcements || [])
      setLoading(false)
    })
  }, [])

  async function create() {
    if (!form.title || !form.body) return toast.error('Vul titel en bericht in')
    const res = await fetch('/api/admin/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Announcement gemaakt!')
      setShowForm(false)
      setForm({ title: '', body: '', type: 'INFO', audience: 'ALL' })
      fetch('/api/admin/announcements').then((r) => r.json()).then((d) => setItems(d.announcements || []))
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    toast.success('Verwijderd')
    setItems(items.filter((i) => i.id !== id))
  }

  return (
    <AdminShell title="Announcements">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0B1B3B]">Announcements</h2>
          <p className="text-sm text-slate-500 mt-1">Stuur berichten naar alle gebruikers</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-gradient text-white rounded-xl">
          <Plus className="w-4 h-4 mr-1.5" /> Nieuw
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5 space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Titel</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl mt-1.5" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Bericht</Label>
            <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className="rounded-xl mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-[#E4E7EE] h-11 px-3 text-sm mt-1.5">
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="FEATURE">Feature</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Doelgroep</Label>
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full rounded-xl border border-[#E4E7EE] h-11 px-3 text-sm mt-1.5">
                <option value="ALL">Iedereen</option>
                <option value="STUDENTS">Studenten</option>
                <option value="ADMINS">Admins</option>
              </select>
            </div>
          </div>
          <Button onClick={create} className="bg-blue-gradient text-white rounded-xl h-11">Aanmaken</Button>
        </Card>
      )}

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className="rounded-2xl border border-[#E4E7EE] p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center"><Bell className="w-5 h-5" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`border-0 text-xs ${a.type === 'WARNING' ? 'bg-[#FFB020]/20 text-[#B45309]' : a.type === 'MAINTENANCE' ? 'bg-[#FF6B6B]/20 text-[#EF4444]' : a.type === 'FEATURE' ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>{a.type}</Badge>
                    <Badge className="bg-[#F4F7FB] text-slate-500 hover:bg-[#F4F7FB] border-0 text-xs">{a.audience}</Badge>
                  </div>
                  <div className="font-semibold text-sm text-[#0B1B3B]">{a.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{a.body}</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(a.createdAt).toLocaleString('nl-NL')}</div>
                </div>
                <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-[#EF4444]"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {items.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Nog geen announcements</div>}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
