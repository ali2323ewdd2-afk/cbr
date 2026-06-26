'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Copy, Share2, Users, Gift, Trophy, Loader2, MessageCircle, Mail } from 'lucide-react'

export default function ReferralPage() {
  const [data, setData] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/referral').then((r) => r.json()),
      fetch('/api/referral/leaderboard').then((r) => r.json()),
    ]).then(([d, lb]) => {
      setData(d)
      setLeaderboard(lb.leaderboard || [])
      setLoading(false)
    })
  }, [])

  function copyLink() {
    if (!data?.link) return
    navigator.clipboard.writeText(data.link)
    toast.success('Link gekopieerd!')
  }

  function shareWhatsApp() {
    if (!data?.link) return
    window.open(`https://wa.me/?text=${encodeURIComponent(`Leer slimmer met LumaRijschool! ${data.link}`)}`, '_blank')
  }

  function shareEmail() {
    if (!data?.link) return
    window.location.href = `mailto:?subject=Uitnodiging LumaRijschool&body=Hoi! Ik leer voor mijn theorie-examen met LumaRijschool. Begin ook gratis: ${data.link}`
  }

  function shareFacebook() {
    if (!data?.link) return
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.link)}`, '_blank')
  }

  if (loading) return <AppShell title="Referral"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AppShell>
  if (!data) return null

  return (
    <AppShell title="Referral">
      {/* Hero with referral code */}
      <div className="rounded-3xl bg-navy-gradient p-8 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#5C8BFF]/30 blur-3xl" />
        <div className="relative">
          <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 mb-3">Referral Program</Badge>
          <h2 className="font-display font-extrabold text-3xl mb-2">Nodig vrienden uit en verdien XP</h2>
          <p className="text-slate-300 max-w-xl">Deel jouw persoonlijke link. Voor elke vriend die zich aanmeldt, verdien je 50 XP. Als ze een abonnement nemen, krijg je 200 XP extra.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-2xl bg-white/10 p-3 border border-white/20">
              <div className="text-xs text-slate-300 mb-1">Jouw referral link</div>
              <div className="font-mono text-sm truncate">{data.link}</div>
            </div>
            <Button onClick={copyLink} className="bg-white text-[#2563EB] hover:bg-slate-100 rounded-xl h-12 px-5">
              <Copy className="w-4 h-4 mr-1.5" /> Kopieer
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={shareWhatsApp} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-xl">
              <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
            </Button>
            <Button onClick={shareFacebook} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-xl">
              <Share2 className="w-4 h-4 mr-1.5" /> Facebook
            </Button>
            <Button onClick={shareEmail} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-xl">
              <Mail className="w-4 h-4 mr-1.5" /> Email
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mb-3"><Users className="w-6 h-6" /></div>
          <div className="font-display font-extrabold text-3xl text-[#0B1B3B]">{data.totalReferrals}</div>
          <div className="text-sm text-slate-500">Totaal uitgenodigd</div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ECFDF3] text-[#16A34A] mb-3"><Trophy className="w-6 h-6" /></div>
          <div className="font-display font-extrabold text-3xl text-[#0B1B3B]">{data.convertedReferrals}</div>
          <div className="text-sm text-slate-500">Aangemeld</div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFB020]/20 text-[#FFB020] mb-3"><Gift className="w-6 h-6" /></div>
          <div className="font-display font-extrabold text-3xl text-[#0B1B3B]">{data.totalXpEarned}</div>
          <div className="text-sm text-slate-500">XP verdiend</div>
        </Card>
      </div>

      {/* Leaderboard + recent */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Leaderboard</div>
          <div className="space-y-2">
            {leaderboard.length === 0 && <div className="text-sm text-slate-500">Nog geen referrals.</div>}
            {leaderboard.slice(0, 10).map((u, i) => (
              <div key={u.userId} className={`flex items-center gap-3 p-3 rounded-xl ${u.userId === data.code ? 'bg-[#EFF6FF]' : 'hover:bg-[#F4F7FB]'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-[#FFB020] text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-[#CD7F32] text-white' : 'bg-[#F4F7FB] text-slate-600'}`}>{i + 1}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-[#0B1B3B]">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.referrals} referrals</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Recente referrals</div>
          <div className="space-y-2">
            {data.recent?.length === 0 && <div className="text-sm text-slate-500">Nog geen vrienden uitgenodigd.</div>}
            {data.recent?.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F4F7FB]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-gradient text-white flex items-center justify-center font-bold text-sm">{r.name[0]}</div>
                  <div>
                    <div className="font-semibold text-sm text-[#0B1B3B]">{r.name}</div>
                    <div className="text-xs text-slate-500">{new Date(r.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
                <div className="text-right">
                  {r.converted ? <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Aangemeld</Badge> : <Badge className="bg-[#F4F7FB] text-slate-500 hover:bg-[#F4F7FB] border-0">In afwachting</Badge>}
                  <div className="text-xs text-[#2563EB] font-semibold mt-1">+{r.reward} XP</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Rewards info */}
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mt-5">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Hoe het werkt</div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#F4F7FB] p-4">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold mb-2">1</div>
            <div className="font-semibold text-sm text-[#0B1B3B]">Deel jouw link</div>
            <div className="text-xs text-slate-500 mt-1">Stuur via WhatsApp, email of social media</div>
          </div>
          <div className="rounded-2xl bg-[#F4F7FB] p-4">
            <div className="w-10 h-10 rounded-xl bg-[#1FB871] text-white flex items-center justify-center font-bold mb-2">2</div>
            <div className="font-semibold text-sm text-[#0B1B3B]">Vriend meldt zich aan</div>
            <div className="text-xs text-slate-500 mt-1">Je verdient 50 XP. Je vriend krijgt 7 dagen gratis Month!</div>
          </div>
          <div className="rounded-2xl bg-[#F4F7FB] p-4">
            <div className="w-10 h-10 rounded-xl bg-[#7C5CFC] text-white flex items-center justify-center font-bold mb-2">3</div>
            <div className="font-semibold text-sm text-[#0B1B3B]">Vriend neemt abonnement</div>
            <div className="text-xs text-slate-500 mt-1">Je verdient extra 200 XP</div>
          </div>
        </div>
      </Card>
    </AppShell>
  )
}
