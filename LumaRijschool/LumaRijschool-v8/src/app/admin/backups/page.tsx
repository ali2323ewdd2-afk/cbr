'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Database, Download, HardDrive } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminBackupsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/backups').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  async function triggerBackup() {
    const res = await fetch('/api/admin/backups', { method: 'POST' })
    if (res.ok) toast.success('Backup ingepland')
  }

  return (
    <AdminShell title="Backups">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0B1B3B]">Database Backups</h2>
          <p className="text-sm text-slate-500 mt-1">Daily/Weekly/Monthly backups met 30/28/90 dagen retentie</p>
        </div>
        <Button onClick={triggerBackup} className="bg-blue-gradient text-white rounded-xl">
          <Database className="w-4 h-4 mr-1.5" /> Handmatige backup
        </Button>
      </div>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="space-y-3">
            {data?.backups?.map((b: any) => (
              <div key={b.filename} className="rounded-2xl border border-[#E4E7EE] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center"><HardDrive className="w-5 h-5" /></div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-[#0B1B3B]">{b.filename}</div>
                  <div className="text-xs text-slate-500">{(b.sizeBytes / 1024 / 1024).toFixed(2)} MB · {new Date(b.createdAt).toLocaleString('nl-NL')}</div>
                </div>
                <Badge className={`border-0 text-xs ${b.type === 'DAILY' ? 'bg-[#EFF6FF] text-[#2563EB]' : b.type === 'WEEKLY' ? 'bg-[#ECFDF3] text-[#16A34A]' : b.type === 'MONTHLY' ? 'bg-[#F3EEFF] text-[#7C5CFC]' : 'bg-[#FFB020]/20 text-[#B45309]'}`}>{b.type}</Badge>
              </div>
            ))}
            {(!data?.backups || data.backups.length === 0) && (
              <div className="text-center py-8">
                <Database className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <div className="text-sm text-slate-500">Nog geen backups. Backups worden automatisch gemaakt via cron (02:00, 03:00 zo, 04:00 maandags).</div>
              </div>
            )}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
