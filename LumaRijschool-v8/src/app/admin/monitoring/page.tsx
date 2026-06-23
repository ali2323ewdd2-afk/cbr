'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Activity, Database, Cpu, HardDrive, Zap, AlertCircle } from 'lucide-react'

export default function AdminMonitoringPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = () => {
      fetch('/api/monitoring').then((r) => r.json()).then((d) => {
        setData(d)
        setLoading(false)
      }).catch(() => setLoading(false))
    }
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000) // auto-refresh every 5s
    return () => clearInterval(interval)
  }, [])

  if (loading) return <AdminShell title="Monitoring"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AdminShell>
  if (!data) return <AdminShell title="Monitoring"><div className="text-center py-20 text-slate-500">Monitoring data niet beschikbaar</div></AdminShell>

  const kpis = [
    { label: 'Uptime', value: `${Math.floor(data.uptime_seconds / 3600)}u ${Math.floor((data.uptime_seconds % 3600) / 60)}m`, icon: Activity, color: '#1FB871' },
    { label: 'Response tijd', value: `${data.response_time_ms}ms`, icon: Zap, color: '#2563EB' },
    { label: 'DB latency', value: `${data.database.latency_ms}ms`, icon: Database, color: '#7C5CFC' },
    { label: 'Redis', value: data.redis.ok ? 'OK' : 'Down', icon: Database, color: data.redis.ok ? '#1FB871' : '#EF4444' },
    { label: 'RSS Memory', value: `${data.memory.rss_mb} MB`, icon: HardDrive, color: '#FFB020' },
    { label: 'Heap', value: `${data.memory.heap_used_mb} / ${data.memory.heap_total_mb} MB`, icon: Cpu, color: '#FF6B6B' },
  ]

  const dbMetrics = [
    { label: 'Gebruikers', value: data.database.users },
    { label: 'Actieve abonnees', value: data.database.active_subscriptions },
    { label: 'Examens gemaakt', value: data.database.exams_taken },
    { label: 'Lessen voltooid', value: data.database.lessons_completed },
    { label: 'AI berichten', value: data.database.ai_messages },
    { label: 'Betalingen', value: data.database.payments },
    { label: 'Terugbetalingen', value: data.database.refunds },
    { label: 'Fouten (24u)', value: data.errors_24h, warning: data.errors_24h > 0 },
  ]

  return (
    <AdminShell title="Monitoring">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0B1B3B]">Systeem Monitoring</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time metrics · auto-ververs elke 5 seconden</p>
        </div>
        <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1FB871] animate-pulse-soft mr-1.5" /> Live
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        {kpis.map((k, i) => (
          <Card key={i} className="rounded-3xl border-[#E4E7EE] shadow-card p-5">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2" style={{ backgroundColor: k.color + '20', color: k.color }}>
              <k.icon className="w-4.5 h-4.5" />
            </div>
            <div className="font-display font-extrabold text-xl text-[#0B1B3B]">{k.value}</div>
            <div className="text-xs text-slate-500">{k.label}</div>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Database Metrics</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dbMetrics.map((m, i) => (
            <div key={i} className={`rounded-2xl p-4 ${m.warning ? 'bg-[#FEF2F2]' : 'bg-[#F4F7FB]'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-slate-500">{m.label}</div>
                {m.warning && <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />}
              </div>
              <div className={`font-display font-extrabold text-2xl ${m.warning ? 'text-[#EF4444]' : 'text-[#0B1B3B]'}`}>
                {typeof m.value === 'number' ? m.value.toLocaleString('nl-NL') : m.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mt-5">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-2">Laatste update</div>
        <div className="text-sm text-slate-500">{data.timestamp}</div>
        <div className="text-xs text-slate-400 mt-2">Status: {data.status}</div>
      </Card>
    </AdminShell>
  )
}
