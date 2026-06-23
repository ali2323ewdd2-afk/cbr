'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrafficCone } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  PRIORITY: 'Voorrang',
  PROHIBITORY: 'Verbod',
  MANDATORY: 'Gebod',
  WARNING: 'Waarschuwing',
  INFORMATIONAL: 'Aanwijzing',
}

const CATEGORY_COLORS: Record<string, string> = {
  PRIORITY: '#2563EB',
  PROHIBITORY: '#EF4444',
  MANDATORY: '#1FB871',
  WARNING: '#FFB020',
  INFORMATIONAL: '#7C5CFC',
}

export default function TrafficSignsPage() {
  const [signs, setSigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState('all')

  useEffect(() => {
    fetch('/api/traffic-signs').then((r) => r.json()).then((d) => {
      setSigns(d.signs || [])
      setLoading(false)
    })
  }, [])

  const filtered = activeCat === 'all' ? signs : signs.filter((s) => s.category === activeCat)
  const cats = Array.from(new Set(signs.map((s) => s.category)))

  return (
    <AppShell title="Verkeersborden Bibliotheek">
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setActiveCat('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeCat === 'all' ? 'bg-blue-gradient text-white shadow-luma-soft' : 'bg-white border border-[#E4E7EE] text-slate-600'}`}
        >
          Alle borden
        </button>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition text-white"
            style={{ backgroundColor: activeCat === c ? CATEGORY_COLORS[c] : '#F4F7FB', color: activeCat === c ? '#fff' : '#475569' }}
          >
            {CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-2xl border border-[#E4E7EE] p-4 text-center hover:shadow-card transition">
                <div className="aspect-square bg-white rounded-xl mb-2 flex items-center justify-center p-2">
                  <img src={s.imageUrl} alt={s.name} className="max-h-full max-w-full" />
                </div>
                <Badge className="border-0 text-xs mb-1" style={{ backgroundColor: CATEGORY_COLORS[s.category] + '20', color: CATEGORY_COLORS[s.category] }}>
                  {s.code}
                </Badge>
                <div className="font-semibold text-sm text-[#0B1B3B] mt-1">{s.name}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</div>
              </div>
            ))}
          </div>
        )}
        {filtered.length === 0 && !loading && (
          <div className="text-center py-8">
            <TrafficCone className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <div className="text-sm text-slate-500">Geen borden in deze categorie.</div>
          </div>
        )}
      </Card>
    </AppShell>
  )
}
