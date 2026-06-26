'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface SubscriptionRow {
  id: string
  status: string
  expiresAt: string
  daysRemaining: number
  user: { name: string | null; email: string }
  plan: { name: string }
}

interface PlanOption {
  id: string
  name: string
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ userId: '', planId: '', days: 30 })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/subscriptions?search=${encodeURIComponent(search)}&pageSize=50`)
      const data = (await res.json()) as { subscriptions?: SubscriptionRow[]; plans?: PlanOption[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Laden mislukt')
      setRows(data.subscriptions ?? [])
      setPlans(data.plans ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Laden mislukt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function mutate(id: string, action: 'EXTEND' | 'CANCEL' | 'GRANT_FREE') {
    const res = await fetch('/api/admin/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, days: 30 }),
    })
    if (res.ok) {
      toast.success('Abonnement bijgewerkt')
      await load()
    } else {
      toast.error('Actie mislukt')
    }
  }

  async function createFree() {
    if (!form.userId || !form.planId) {
      toast.error('User ID en Plan ID zijn verplicht')
      return
    }
    const res = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, status: 'ACTIVE', autoRenew: false }),
    })
    if (res.ok) {
      toast.success('Gratis abonnement toegevoegd')
      setForm({ userId: '', planId: '', days: 30 })
      await load()
    } else {
      toast.error('Toevoegen mislukt')
    }
  }

  return (
    <AdminShell title="Subscriptions">
      <div className="space-y-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display text-xl font-bold text-[#0B1B3B]">Subscriptions</div>
          <div className="text-sm text-slate-500">Zoeken, filteren, verlengen, annuleren en gratis toegang geven.</div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek student, email of plan" className="rounded-xl" />
            <Button onClick={() => void load()} className="rounded-xl bg-blue-gradient text-white">Zoeken</Button>
          </div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="mb-4 font-display text-lg font-bold text-[#0B1B3B]">Gratis abonnement</div>
          <div className="grid gap-3 md:grid-cols-4">
            <Input value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} placeholder="User ID" className="rounded-xl" />
            <select value={form.planId} onChange={(event) => setForm({ ...form, planId: event.target.value })} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Selecteer plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            <Input type="number" value={form.days} onChange={(event) => setForm({ ...form, days: Number(event.target.value) })} className="rounded-xl" />
            <Button onClick={() => void createFree()} className="rounded-xl bg-blue-gradient text-white"><Plus className="mr-2 h-4 w-4" />Toevoegen</Button>
          </div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div> : error ? (
            <div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error}</div>
          ) : rows.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">Geen abonnementen gevonden.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#E4E7EE] text-left">
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Student</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Plan</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Einde</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Acties</th>
                </tr></thead>
                <tbody>{rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#E4E7EE]/60 last:border-0">
                    <td className="py-3 text-sm font-semibold text-[#0B1B3B]">{row.user.name ?? row.user.email}</td>
                    <td className="py-3 text-sm">{row.plan.name}</td>
                    <td className="py-3"><Badge className="border-0 bg-[#ECFDF3] text-[#16A34A]">{row.status}</Badge></td>
                    <td className="py-3 text-sm">{new Date(row.expiresAt).toLocaleDateString('nl-NL')} ({row.daysRemaining} dagen)</td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outline" className="mr-2 rounded-xl" onClick={() => void mutate(row.id, 'EXTEND')}>+30 dagen</Button>
                      <Button size="sm" variant="outline" className="mr-2 rounded-xl" onClick={() => void mutate(row.id, 'GRANT_FREE')}>Gratis</Button>
                      <Button size="sm" variant="ghost" className="rounded-xl text-[#EF4444]" onClick={() => void mutate(row.id, 'CANCEL')}>Annuleer</Button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  )
}
