'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Download } from 'lucide-react'

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/invoices').then((r) => r.json()).then((d) => {
      setInvoices(d.invoices || [])
      setLoading(false)
    })
  }, [])

  return (
    <AdminShell title="Facturen">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Alle facturen</div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E4E7EE] text-left">
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Factuur</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Gebruiker</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Bedrag</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">BTW</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Status</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Datum</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#E4E7EE]/50 last:border-0 hover:bg-[#F4F7FB]">
                    <td className="py-3 text-sm font-mono">{inv.invoiceNumber}</td>
                    <td className="py-3 text-sm">{inv.user?.email}</td>
                    <td className="py-3 text-sm">€{(inv.amountCents / 100).toFixed(2)}</td>
                    <td className="py-3 text-sm text-slate-500">€{(inv.taxCents / 100).toFixed(2)}</td>
                    <td className="py-3">
                      <Badge className={`border-0 text-xs ${inv.status === 'PAID' ? 'bg-[#ECFDF3] text-[#16A34A]' : inv.status === 'OPEN' ? 'bg-[#FFB020]/20 text-[#B45309]' : 'bg-[#F4F7FB] text-slate-500'}`}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-xs text-slate-500">{new Date(inv.issuedAt).toLocaleDateString('nl-NL')}</td>
                    <td className="py-3 text-right">
                      {inv.pdfUrl && <a href={inv.pdfUrl} target="_blank" rel="noopener" className="text-[#2563EB] hover:text-[#1D4ED8]"><Download className="w-4 h-4 inline" /></a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Nog geen facturen</div>}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
