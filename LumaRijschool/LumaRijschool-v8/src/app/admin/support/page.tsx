'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock } from 'lucide-react'
import Link from 'next/link'

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/support').then((r) => r.json()).then((d) => {
      setTickets(d.tickets || [])
      setLoading(false)
    })
  }, [])

  return (
    <AdminShell title="Support Tickets">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Alle support tickets</div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <Link key={t.id} href={`/admin/support/${t.id}`} className="block rounded-2xl p-4 hover:bg-[#F4F7FB] border border-[#E4E7EE]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`border-0 text-xs ${t.status === 'OPEN' ? 'bg-[#EFF6FF] text-[#2563EB]' : t.status === 'ANSWERED' ? 'bg-[#FFB020]/20 text-[#B45309]' : t.status === 'RESOLVED' ? 'bg-[#ECFDF3] text-[#16A34A]' : 'bg-[#F4F7FB] text-slate-500'}`}>
                        {t.status}
                      </Badge>
                      <Badge className="bg-[#F4F7FB] text-slate-600 hover:bg-[#F4F7FB] border-0 text-xs">{t.priority}</Badge>
                      <span className="text-xs text-slate-400">#{t.id.slice(-6)}</span>
                    </div>
                    <div className="font-semibold text-sm text-[#0B1B3B]">{t.subject}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{t.body}</div>
                    <div className="text-xs text-slate-400 mt-1">van {t.user?.email}</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div className="flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {new Date(t.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</div>
                    <div className="mt-1">{t._count?.replies || 0} reacties</div>
                  </div>
                </div>
              </Link>
            ))}
            {tickets.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Geen support tickets</div>}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
