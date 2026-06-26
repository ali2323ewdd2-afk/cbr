'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock } from 'lucide-react'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/audit').then((r) => r.json()).then((d) => {
      setLogs(d.logs || [])
      setLoading(false)
    })
  }, [])

  return (
    <AdminShell title="Audit Log">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Audit logs</div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#F4F7FB]">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-slate-600">{(log.actor?.name ?? 'S')[0]}</div>
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-semibold text-[#0B1B3B]">{log.actor?.name ?? 'System'}</span>
                    <span className="text-slate-600"> {log.action}</span>
                    {log.entity && <span className="text-slate-500"> · {log.entity}</span>}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString('nl-NL')}
                    {log.ip && <span> · IP: {log.ip}</span>}
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Nog geen audit logs</div>}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
