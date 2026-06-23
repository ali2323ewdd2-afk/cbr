'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/refunds').then((r) => r.json()).then((d) => {
      setRefunds(d.refunds || [])
      setLoading(false)
    })
  }, [])

  async function createRefund(paymentId: string) {
    if (!confirm('Weet je zeker dat je een terugbetaling wilt starten?')) return
    const res = await fetch('/api/admin/refunds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, reason: 'REQUESTED' }),
    })
    if (res.ok) {
      toast.success('Terugbetaling gestart')
      fetch('/api/admin/refunds').then((r) => r.json()).then((d) => setRefunds(d.refunds || []))
    } else {
      toast.error('Terugbetaling mislukt')
    }
  }

  return (
    <AdminShell title="Terugbetalingen">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Terugbetalingen</div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : refunds.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">Nog geen terugbetalingen</div>
        ) : (
          <div className="space-y-2">
            {refunds.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#E4E7EE] p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-[#0B1B3B]">{r.payment?.user?.name ?? 'Onbekend'}</div>
                  <div className="text-xs text-slate-500">{r.payment?.user?.email}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    €{(r.amountCents / 100).toFixed(2)} · {new Date(r.createdAt).toLocaleString('nl-NL')}
                  </div>
                </div>
                <Badge className={`border-0 ${r.status === 'SUCCEEDED' ? 'bg-[#ECFDF3] text-[#16A34A]' : r.status === 'PENDING' ? 'bg-[#FFB020]/20 text-[#B45309]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
