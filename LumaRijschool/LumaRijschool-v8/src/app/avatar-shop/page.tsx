'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, ShoppingBag, Check, Sparkles } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  STANDARD: 'Standaard',
  PREMIUM: 'Premium',
  LEGENDARY: 'Legendary',
  SECRET: 'Geheim',
}

const CATEGORY_COLORS: Record<string, string> = {
  STANDARD: '#94A3B8',
  PREMIUM: '#7C5CFC',
  LEGENDARY: '#FFB020',
  SECRET: '#FF6B6B',
}

export default function AvatarShopPage() {
  const [data, setData] = useState<{ avatars: any[]; owned: any[]; equipped: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/avatar-shop').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  async function buy(avatarId: string) {
    setActionLoading(avatarId)
    const res = await fetch('/api/avatar-shop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarId, action: 'buy' }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (res.ok) {
      toast.success('Avatar gekocht en uitgerust!')
      fetch('/api/avatar-shop').then((r) => r.json()).then(setData)
    } else {
      toast.error(d.error || 'Kopen mislukt')
    }
  }

  async function equip(avatarId: string) {
    setActionLoading(avatarId)
    await fetch('/api/avatar-shop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarId, action: 'equip' }),
    })
    setActionLoading(null)
    toast.success('Avatar uitgerust!')
    fetch('/api/avatar-shop').then((r) => r.json()).then(setData)
  }

  if (loading) return <AppShell title="Avatar Shop"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AppShell>
  if (!data) return null

  const ownedIds = new Set(data.owned.map((o: any) => o.id))

  return (
    <AppShell title="Avatar Shop">
      <div className="rounded-3xl bg-gradient-to-br from-[#7C5CFC] to-[#5C8BFF] p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 mb-3">Avatar Shop</Badge>
        <h2 className="font-display font-extrabold text-3xl mb-2">Personaliseer je profiel</h2>
        <p className="text-slate-200 max-w-xl">Besteed je verdiende XP aan unieke avatars. Toon je status met Legendary en Secret avatars!</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {data.avatars.map((a: any) => {
          const owned = ownedIds.has(a.id)
          const equipped = data.equipped?.id === a.id
          const color = CATEGORY_COLORS[a.category] || '#94A3B8'
          return (
            <Card key={a.id} className={`rounded-3xl border-2 p-4 text-center transition ${equipped ? 'border-[#1FB871]' : 'border-[#E4E7EE]'}`}>
              <div className="aspect-square rounded-2xl mb-3 flex items-center justify-center text-5xl" style={{ background: `linear-gradient(135deg, ${color}30, ${color}10)` }}>
                {a.imageUrl ? <img src={a.imageUrl} alt={a.name} className="w-full h-full rounded-2xl object-cover" /> : '🎨'}
              </div>
              <Badge className="border-0 text-xs mb-1" style={{ backgroundColor: color + '20', color }}>{CATEGORY_LABELS[a.category] || a.category}</Badge>
              <div className="font-semibold text-sm text-[#0B1B3B] mt-1">{a.name}</div>
              <div className="text-xs text-[#FFB020] font-bold mt-1">{a.costXp} XP</div>
              {equipped ? (
                <div className="mt-2 text-xs text-[#1FB871] font-semibold inline-flex items-center gap-1"><Check className="w-3 h-3" /> Uitgerust</div>
              ) : owned ? (
                <Button onClick={() => equip(a.id)} size="sm" variant="outline" className="mt-2 w-full rounded-xl border-[#E4E7EE]" disabled={actionLoading === a.id}>
                  Uitrusten
                </Button>
              ) : (
                <Button onClick={() => buy(a.id)} size="sm" className="mt-2 w-full bg-blue-gradient text-white rounded-xl" disabled={actionLoading === a.id}>
                  {actionLoading === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Koop</>}
                </Button>
              )}
            </Card>
          )
        })}
      </div>
    </AppShell>
  )
}
