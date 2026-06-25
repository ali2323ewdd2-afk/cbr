'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', description: '', type: 'PERCENT', value: 10, maxRedemptions: 100, endsAt: '', appliesToPlanSlug: '' })

  useEffect(() => {
    fetch('/api/admin/coupons').then((r) => r.json()).then((d) => {
      setCoupons(d.coupons || [])
      setLoading(false)
    })
  }, [])

  async function create() {
    if (!form.code) return toast.error('Code verplicht')
    const res = await fetch('/api/admin/coupons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Coupon aangemaakt')
      setShowForm(false)
      setForm({ code: '', description: '', type: 'PERCENT', value: 10, maxRedemptions: 100, endsAt: '', appliesToPlanSlug: '' })
      fetch('/api/admin/coupons').then((r) => r.json()).then((d) => setCoupons(d.coupons || []))
    } else {
      toast.error('Aanmaken mislukt')
    }
  }

  async function deactivate(id: string) {
    await fetch('/api/admin/coupons', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('Gedeactiveerd')
    fetch('/api/admin/coupons').then((r) => r.json()).then((d) => setCoupons(d.coupons || []))
  }

  return (
    <AdminShell title="Coupons">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0B1B3B]">Coupon Codes</h2>
          <p className="text-sm text-slate-500 mt-1">Maak kortingscodes voor promoties (SUMMER2026, WELCOME10, BLACKFRIDAY)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-gradient text-white rounded-xl">
          <Plus className="w-4 h-4 mr-1.5" /> Nieuwe coupon
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded-xl mt-1.5 font-mono" placeholder="SUMMER2026" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-[#E4E7EE] h-11 px-3 text-sm mt-1.5">
                <option value="PERCENT">Percentage</option>
                <option value="FIXED">Vast bedrag (EUR)</option>
                <option value="DAYS">Extra dagen</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Waarde</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) })} className="rounded-xl mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Max keer te gebruiken</Label>
              <Input type="number" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: parseInt(e.target.value) })} className="rounded-xl mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Geldig tot</Label>
              <Input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="rounded-xl mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Alleen voor plan (optioneel)</Label>
              <Input value={form.appliesToPlanSlug} onChange={(e) => setForm({ ...form, appliesToPlanSlug: e.target.value })} className="rounded-xl mt-1.5" placeholder="WEEK of MONTH" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Beschrijving</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1.5" placeholder="Zomeractie 2026" />
          </div>
          <Button onClick={create} className="bg-blue-gradient text-white rounded-xl h-11">Aanmaken</Button>
        </Card>
      )}

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E4E7EE] text-left">
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Code</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Type</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Waarde</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Gebruikt</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Status</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Actie</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-[#E4E7EE]/50 last:border-0 hover:bg-[#F4F7FB]">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#2563EB]" />
                        <span className="font-mono font-bold text-sm text-[#0B1B3B]">{c.code}</span>
                      </div>
                      <div className="text-xs text-slate-500 ml-6">{c.description || '—'}</div>
                    </td>
                    <td className="py-3 text-sm">{c.type}</td>
                    <td className="py-3 text-sm font-semibold">{c.value}{c.type === 'PERCENT' ? '%' : c.type === 'FIXED' ? '€' : ' dagen'}</td>
                    <td className="py-3 text-sm text-slate-500">{c._count?.redemptions || 0}{c.maxRedemptions > 0 ? ` / ${c.maxRedemptions}` : ''}</td>
                    <td className="py-3">
                      <Badge className={c.isActive ? 'bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0' : 'bg-[#F4F7FB] text-slate-500 hover:bg-[#F4F7FB] border-0'}>
                        {c.isActive ? 'Actief' : 'Inactief'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button onClick={() => deactivate(c.id)} variant="ghost" size="sm" className="text-[#EF4444] hover:bg-[#FEF2F2] rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {coupons.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Nog geen coupons</div>}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
