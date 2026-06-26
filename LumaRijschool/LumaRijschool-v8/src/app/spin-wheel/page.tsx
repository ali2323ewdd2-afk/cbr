'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Gift, Zap, Crown } from 'lucide-react'

export default function SpinWheelPage() {
  const [data, setData] = useState<{ canSpin: boolean; lastSpin: any; prizes: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/spin-wheel').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  async function spin() {
    setSpinning(true)
    setResult(null)
    const res = await fetch('/api/spin-wheel', { method: 'POST' })
    const d = await res.json()
    setSpinning(false)
    if (res.ok) {
      setResult(d.prize)
      toast.success(d.prize.label)
      fetch('/api/spin-wheel').then((r) => r.json()).then(setData)
    } else {
      toast.error(d.error || 'Kan nu niet draaien')
    }
  }

  if (loading) return <AppShell title="Spin Wheel"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AppShell>
  if (!data) return null

  return (
    <AppShell title="Daily Spin Wheel">
      <div className="rounded-3xl bg-gradient-to-br from-[#FFB020] to-[#FF6B6B] p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 mb-3">Dagelijks</Badge>
        <h2 className="font-display font-extrabold text-3xl mb-2">Draai elke dag voor beloningen!</h2>
        <p className="text-slate-100 max-w-xl">Eén gratis draai per dag. Win XP, badges, streak beschermers of de JACKPOT van 500 XP!</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-8 text-center">
          {/* Wheel visualization */}
          <div className="relative w-64 h-64 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full border-8 border-[#FFB020] ${spinning ? 'animate-spin' : ''}`} style={{ animationDuration: spinning ? '0.5s' : undefined }}>
              {data.prizes.map((p, i) => {
                const angle = (360 / data.prizes.length) * i
                return (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-start justify-center pt-2"
                    style={{ transform: `rotate(${angle}deg)`, transformOrigin: 'center' }}
                  >
                    <span className="text-xs font-bold" style={{ color: p.color }}>{p.label}</span>
                  </div>
                )
              })}
            </div>
            <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-blue-gradient flex items-center justify-center shadow-luma">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-[#0B1B3B]" />
          </div>

          <Button
            onClick={spin}
            disabled={!data.canSpin || spinning}
            className="w-full bg-gradient-to-r from-[#FFB020] to-[#FF6B6B] text-white rounded-xl h-14 text-lg font-bold shadow-luma"
          >
            {spinning ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Draaien...</> : data.canSpin ? <>🎯 Draai nu!</> : 'Vandaag al gedraaid'}
          </Button>

          {result && (
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#ECFDF3] to-[#DCFCE7] p-4 animate-pop">
              <div className="font-display font-extrabold text-2xl text-[#0B1B3B]">{result.label}</div>
              <div className="text-xs text-slate-600 mt-1">Gefeliciteerd! Je prijz is toegevoegd aan je account.</div>
            </div>
          )}
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Mogelijke prijzen</div>
          <div className="space-y-2">
            {data.prizes.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#F4F7FB]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                  {p.type === 'JACKPOT' ? <Crown className="w-5 h-5" style={{ color: p.color }} /> : p.type === 'XP' ? <Zap className="w-5 h-5" style={{ color: p.color }} /> : <Gift className="w-5 h-5" style={{ color: p.color }} />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-[#0B1B3B]">{p.label}</div>
                  <div className="text-xs text-slate-500">Kans: {Math.round(p.chance * 100)}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
