'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Gift, Loader2, Sparkles } from 'lucide-react'

export default function MysteryBoxPage() {
  const [data, setData] = useState<{ boxes: any[]; myClaims: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState<string | null>(null)
  const [lastReward, setLastReward] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/mystery-box').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  async function openBox(box: any) {
    setOpening(box.id)
    setLastReward(null)
    try {
      const res = await fetch(`/api/mystery-box/${box.id}/open`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Kon box niet openen')
      } else {
        setLastReward({ ...data.reward, message: data.message, boxName: box.name, icon: box.iconKey })
        toast.success(data.message)
        // Refresh
        fetch('/api/mystery-box').then((r) => r.json()).then((d) => setData(d))
      }
    } catch (e: any) {
      toast.error(e.message)
    }
    setOpening(null)
  }

  if (loading) return <AppShell title="Mystery Box"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AppShell>
  if (!data) return null

  return (
    <AppShell title="Mystery Box">
      <div className="rounded-3xl bg-gradient-to-br from-[#7C5CFC] to-[#5C8BFF] p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 mb-3">Mystery Boxes</Badge>
          <h2 className="font-display font-extrabold text-3xl mb-2">Open een Mystery Box en win!</h2>
          <p className="text-slate-200 max-w-xl">Gebruik je XP om boxes te openen. Elke box bevat willekeurige beloningen — van XP tot exclusieve badges en streak beschermers.</p>
        </div>
      </div>

      {/* Last reward banner */}
      {lastReward && (
        <Card className="rounded-3xl border-0 shadow-luma p-6 mb-5 bg-gradient-to-br from-[#ECFDF3] to-[#DCFCE7] animate-pop">
          <div className="flex items-center gap-4">
            <div className="text-5xl animate-float">{lastReward.icon}</div>
            <div>
              <div className="font-display font-extrabold text-xl text-[#0B1B3B]">{lastReward.message}</div>
              <div className="text-sm text-slate-600 mt-1">Gefeliciteerd! Je opende een {lastReward.boxName}.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Boxes grid */}
      <div className="grid md:grid-cols-3 gap-5">
        {data.boxes.map((box) => (
          <Card key={box.id} className="rounded-3xl border-[#E4E7EE] shadow-card overflow-hidden hover:shadow-luma-soft transition-all duration-300 hover:-translate-y-1">
            <div className="aspect-[5/3] flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${box.color}30, ${box.color}10)` }}>
              <div className="text-7xl animate-float">{box.iconKey}</div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-lg text-[#0B1B3B]">{box.name}</h3>
                <Badge className="border-0 text-white" style={{ backgroundColor: box.color }}>{box.costXp} XP</Badge>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{box.description}</p>
              <Button
                onClick={() => openBox(box)}
                disabled={opening === box.id}
                className="w-full bg-gradient-to-r from-[#7C5CFC] to-[#5C8BFF] text-white rounded-xl h-11 hover:opacity-90"
              >
                {opening === box.id ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Openen...</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Open box</>}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent claims */}
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mt-5">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Recent geopend</div>
        {data.myClaims.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <div className="text-sm text-slate-500">Nog geen boxes geopend. Begin boven!</div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.myClaims.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F4F7FB]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: (c.box?.color || '#7C5CFC') + '20' }}>{c.box?.iconKey || '📦'}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-[#0B1B3B]">{c.box?.name || 'Mystery Box'}</div>
                  <div className="text-xs text-slate-500">{new Date(c.openedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">
                  {c.rewardType === 'XP' ? `+${c.rewardAmount} XP` : c.rewardType === 'BADGE' ? `Badge: ${c.rewardMeta}` : c.rewardMeta || c.rewardType}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  )
}
