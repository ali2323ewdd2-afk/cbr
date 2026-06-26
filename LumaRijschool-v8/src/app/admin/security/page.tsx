'use client'

import { useEffect, useState } from 'react'
import { Loader2, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface SecurityData {
  ipBlocks: { id: string; ip: string; reason: string; blockedAt: string }[]
  devices: { id: string; userAgent: string; ip: string; lastSeen: string; user: { name: string | null; email: string } }[]
  auditLogs: { id: string; action: string; entity: string; createdAt: string; actor: { name: string | null; email: string } | null }[]
  antiCheatLogs: { id: string; eventType: string; severity: string; createdAt: string; user: { name: string | null; email: string } | null }[]
}

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/security')
    const body = (await res.json()) as SecurityData
    setData(body)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function action(payload: Record<string, string>) {
    const res = await fetch('/api/admin/security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      toast.success('Security actie uitgevoerd')
      setIp('')
      setReason('')
      await load()
    } else {
      const body = (await res.json()) as { error?: string }
      toast.error(body.error ?? 'Actie mislukt')
    }
  }

  return (
    <AdminShell title="Security">
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" /></div> : (
        <div className="space-y-5">
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
            <div className="font-display text-xl font-bold text-[#0B1B3B]">IP blokkeren</div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
              <Input value={ip} onChange={(event) => setIp(event.target.value)} placeholder="IP-adres" className="rounded-xl" />
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reden" className="rounded-xl" />
              <Button className="rounded-xl bg-blue-gradient text-white" onClick={() => void action({ action: 'BLOCK_IP', ip, reason })}><Shield className="mr-2 h-4 w-4" />Blokkeer</Button>
            </div>
          </Card>
          <SecurityList title="IP Blocks" empty="Geen geblokkeerde IPs">
            {data?.ipBlocks.map((block) => (
              <Row key={block.id} title={block.ip} meta={`${block.reason} - ${new Date(block.blockedAt).toLocaleString('nl-NL')}`}>
                <Button variant="ghost" size="sm" className="rounded-xl text-[#EF4444]" onClick={() => void action({ action: 'UNBLOCK_IP', ip: block.ip })}><Trash2 className="h-4 w-4" /></Button>
              </Row>
            ))}
          </SecurityList>
          <SecurityList title="Trusted devices" empty="Geen trusted devices">
            {data?.devices.map((device) => (
              <Row key={device.id} title={device.user.name ?? device.user.email} meta={`${device.ip} - ${device.userAgent} - ${new Date(device.lastSeen).toLocaleString('nl-NL')}`}>
                <Button variant="ghost" size="sm" className="rounded-xl text-[#EF4444]" onClick={() => void action({ action: 'REVOKE_DEVICE', deviceId: device.id })}><Trash2 className="h-4 w-4" /></Button>
              </Row>
            ))}
          </SecurityList>
          <SecurityList title="Audit logs" empty="Geen audit logs">
            {data?.auditLogs.map((log) => (
              <Row key={log.id} title={`${log.action} ${log.entity}`} meta={`${log.actor?.name ?? log.actor?.email ?? 'System'} - ${new Date(log.createdAt).toLocaleString('nl-NL')}`} />
            ))}
          </SecurityList>
          <SecurityList title="Suspicious activity" empty="Geen verdachte activiteit">
            {data?.antiCheatLogs.map((log) => (
              <Row key={log.id} title={log.eventType} meta={`${log.user?.name ?? log.user?.email ?? 'Onbekend'} - ${new Date(log.createdAt).toLocaleString('nl-NL')}`}>
                <Badge className="border-0 bg-[#FEF2F2] text-[#EF4444]">{log.severity}</Badge>
              </Row>
            ))}
          </SecurityList>
        </div>
      )}
    </AdminShell>
  )
}

function SecurityList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : 0
  return (
    <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
      <div className="font-display text-lg font-bold text-[#0B1B3B]">{title}</div>
      <div className="mt-4 space-y-2">{count > 0 ? children : <div className="py-8 text-center text-sm text-slate-500">{empty}</div>}</div>
    </Card>
  )
}

function Row({ title, meta, children }: { title: string; meta: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E4E7EE] p-4">
      <div>
        <div className="text-sm font-semibold text-[#0B1B3B]">{title}</div>
        <div className="text-xs text-slate-500">{meta}</div>
      </div>
      {children}
    </div>
  )
}
