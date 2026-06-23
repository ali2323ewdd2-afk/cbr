'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface PaymentRow {
  id: string
  amountCents: number
  currency: string
  status: string
  stripePaymentIntentId: string | null
  stripeSessionId: string | null
  createdAt: string
  user: { name: string | null; email: string }
  plan: { name: string }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/payments?${params.toString()}`)
      const data = (await res.json()) as { payments?: PaymentRow[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Laden mislukt')
      setPayments(data.payments ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Laden mislukt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function refund(paymentId: string) {
    if (!window.confirm('Refund deze betaling?')) return
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, reason: 'REQUESTED' }),
    })
    if (res.ok) {
      toast.success('Refund aangevraagd')
      await load()
    } else {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? 'Refund mislukt')
    }
  }

  function exportCsv() {
    const params = new URLSearchParams({ export: 'csv', pageSize: '1000' })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    window.open(`/api/admin/payments?${params.toString()}`, '_blank')
  }

  return (
    <AdminShell title="Payments">
      <div className="space-y-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-xl font-bold text-[#0B1B3B]">Payments</div>
              <div className="text-sm text-slate-500">Bekijk betalingen, Stripe IDs, status en refunds.</div>
            </div>
            <Button onClick={exportCsv} variant="outline" className="rounded-xl"><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek betaling, gebruiker of plan" className="rounded-xl" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Alle statussen</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
            <Button onClick={() => void load()} className="rounded-xl bg-blue-gradient text-white">Filter</Button>
          </div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div> : error ? (
            <div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error}</div>
          ) : payments.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">Geen betalingen gevonden.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#E4E7EE] text-left">
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Gebruiker</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Plan</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Stripe ID</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Bedrag</th>
                  <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Acties</th>
                </tr></thead>
                <tbody>{payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[#E4E7EE]/60 last:border-0">
                    <td className="py-3 text-sm font-semibold text-[#0B1B3B]">{payment.user.name ?? payment.user.email}</td>
                    <td className="py-3 text-sm">{payment.plan.name}</td>
                    <td className="py-3 text-xs text-slate-500">{payment.stripePaymentIntentId ?? payment.stripeSessionId ?? '-'}</td>
                    <td className="py-3 text-sm">{(payment.amountCents / 100).toFixed(2)} {payment.currency}</td>
                    <td className="py-3"><Badge className="border-0 bg-slate-100 text-slate-700">{payment.status}</Badge></td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void refund(payment.id)}>
                        <RotateCcw className="mr-2 h-4 w-4" />Refund
                      </Button>
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
