'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Save, Zap, Flame, Trophy, Target, Award, Crown, Shield, Smartphone, Key, QrCode } from 'lucide-react'
import { RANKS, rankFromXp } from '@/lib/gamification/engine'

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null)
  const [gamification, setGamification] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', phone: '', studyGoal: 'STEADY', dailyGoalMin: 30, examDate: '' })
  const [saving, setSaving] = useState(false)
  // 2FA state
  const [twoFA, setTwoFA] = useState<{ enabled: boolean; qrDataUrl?: string; secret?: string } | null>(null)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [twoFAToken, setTwoFAToken] = useState('')
  const [twoFADisableToken, setTwoFADisableToken] = useState('')
  const [twoFALoading, setTwoFALoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then((r) => r.json()),
      fetch('/api/gamification/me').then((r) => r.json()),
    ]).then(([m, g]) => {
      setMe(m.user)
      setGamification(g)
      setForm({
        name: m.user?.name ?? '',
        phone: m.user?.phone ?? '',
        studyGoal: m.user?.studyGoal ?? 'STEADY',
        dailyGoalMin: m.user?.dailyGoalMin ?? 30,
        examDate: m.user?.examDate ? m.user.examDate.slice(0, 10) : '',
      })
    })
  }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) toast.success('Profiel opgeslagen')
    else toast.error('Opslaan mislukt')
  }

  if (!me) return (
    <AppShell title="Profiel">
      <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div>
    </AppShell>
  )

  return (
    <AppShell title="Profiel">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-gradient text-white font-display font-bold text-2xl flex items-center justify-center shadow-luma-soft">
              {(me.name ?? 'S')[0]}
            </div>
            <div>
              <div className="font-display font-bold text-lg text-[#0B1B3B]">{me.name}</div>
              <div className="text-sm text-slate-500">{me.email}</div>
              <Badge className="mt-1 bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF] border-0">
                Level {gamification?.level ?? 1}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-[#F4F7FB] p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFB020]/20 text-[#FFB020] flex items-center justify-center"><Zap className="w-4.5 h-4.5" /></div>
              <div>
                <div className="text-xs text-slate-500">Totaal XP</div>
                <div className="font-display font-bold text-lg text-[#0B1B3B]">{(gamification?.totalXp ?? 0).toLocaleString('nl-NL')}</div>
              </div>
            </div>
            <div className="rounded-2xl bg-[#F4F7FB] p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF6B6B]/20 text-[#FF6B6B] flex items-center justify-center"><Flame className="w-4.5 h-4.5" /></div>
              <div>
                <div className="text-xs text-slate-500">Huidige streak</div>
                <div className="font-display font-bold text-lg text-[#0B1B3B]">{gamification?.streak?.current ?? 0} dagen</div>
              </div>
            </div>
            <div className="rounded-2xl bg-[#F4F7FB] p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#7C5CFC]/20 text-[#7C5CFC] flex items-center justify-center"><Trophy className="w-4.5 h-4.5" /></div>
              <div>
                <div className="text-xs text-slate-500">Badges verdiend</div>
                <div className="font-display font-bold text-lg text-[#0B1B3B]">{gamification?.badges?.filter((b: any) => b.unlocked).length ?? 0} / {gamification?.badges?.length ?? 0}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs: settings / badges / achievements */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="settings">
            <TabsList className="bg-[#F4F7FB] rounded-xl p-1">
              <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Instellingen</TabsTrigger>
              <TabsTrigger value="badges" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Badges</TabsTrigger>
              <TabsTrigger value="achievements" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Achievements</TabsTrigger>
              <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Beveiliging</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mt-3">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Naam</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Telefoon</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl mt-1.5" placeholder="+31 6 ..." />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Studiedoel</Label>
                    <select
                      value={form.studyGoal}
                      onChange={(e) => setForm({ ...form, studyGoal: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#E4E7EE] h-11 px-3 text-sm"
                    >
                      <option value="FAST">Snel slagen</option>
                      <option value="STEADY">Rustig leren</option>
                      <option value="EXAMS_ONLY">Alleen examens</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Minuten per dag</Label>
                      <Input type="number" value={form.dailyGoalMin} onChange={(e) => setForm({ ...form, dailyGoalMin: +e.target.value })} className="rounded-xl mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Examen datum</Label>
                      <Input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="rounded-xl mt-1.5" />
                    </div>
                  </div>
                  <Button onClick={save} disabled={saving} className="bg-blue-gradient text-white rounded-xl h-11">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Opslaan</>}
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="badges">
              <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mt-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gamification?.badges?.map((b: any) => (
                    <div
                      key={b.id}
                      className={`rounded-2xl p-4 text-center transition ${b.unlocked ? 'bg-white border-2' : 'bg-[#F4F7FB] opacity-60'}`}
                      style={b.unlocked ? { borderColor: b.color + '60' } : {}}
                    >
                      <div className="text-4xl mb-2">{b.iconKey}</div>
                      <div className="font-display font-bold text-sm text-[#0B1B3B]">{b.name}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-tight">{b.description}</div>
                      {b.unlocked && <Badge className="mt-2 bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Verdiend</Badge>}
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mt-3">
                <div className="space-y-3">
                  {gamification?.achievements?.map((a: any) => {
                    const pct = a.goalValue > 0 ? Math.min(100, Math.round((a.progress / a.goalValue) * 100)) : 0
                    return (
                      <div key={a.id} className="rounded-2xl bg-[#F4F7FB] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                              a.tier === 'GOLD' ? 'bg-[#FFB020]/20' :
                              a.tier === 'SILVER' ? 'bg-slate-200' :
                              a.tier === 'PLATINUM' ? 'bg-[#7C5CFC]/20' :
                              'bg-[#FF6B6B]/20'
                            }`}>{a.iconKey}</div>
                            <div>
                              <div className="font-semibold text-sm text-[#0B1B3B]">{a.name}</div>
                              <div className="text-xs text-slate-500">{a.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">{a.progress}/{a.goalValue}</div>
                            {a.completed && <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0 text-xs">Voltooid</Badge>}
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-gradient" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mt-3 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-[#2563EB]" />
                    <div className="font-display font-bold text-lg text-[#0B1B3B]">Tweestapsverificatie (2FA)</div>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">Bescherm je account met een extra verificatie via Google Authenticator of vergelijkbare apps.</p>

                  {twoFA?.enabled ? (
                    <div className="rounded-2xl bg-[#ECFDF3] border border-[#1FB871]/30 p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-[#16A34A]">2FA is actief</div>
                        <div className="text-xs text-slate-600 mt-0.5">Je account is beveiligd met een authenticator app.</div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={twoFADisableToken}
                          onChange={(e) => setTwoFADisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="6-cijferige code"
                          className="rounded-xl"
                        />
                        <Button
                          variant="outline"
                          disabled={twoFADisableToken.length !== 6}
                          onClick={async () => {
                            const res = await fetch('/api/security/2fa/disable', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ token: twoFADisableToken }),
                            })
                            if (res.ok) {
                              setTwoFA({ enabled: false })
                              setTwoFADisableToken('')
                              toast.success('2FA uitgeschakeld')
                            } else {
                              toast.error('Ongeldige code')
                            }
                          }}
                          className="rounded-xl border-[#E4E7EE] text-[#EF4444] hover:text-[#EF4444]"
                        >
                          Uitschakelen
                        </Button>
                      </div>
                    </div>
                  ) : show2FASetup ? (
                    <div className="rounded-2xl bg-[#F4F7FB] p-4 space-y-3">
                      {twoFA?.qrDataUrl && (
                        <div className="text-center">
                          <img src={twoFA.qrDataUrl} alt="QR" className="w-48 h-48 mx-auto rounded-2xl bg-white p-2" />
                          <div className="text-xs text-slate-500 mt-2">Scan met Google Authenticator en voer de 6-cijferige code in.</div>
                          <div className="text-xs text-slate-400 mt-1">Secret: <code className="font-mono">{twoFA.secret}</code></div>
                        </div>
                      )}
                      <Input
                        value={twoFAToken}
                        onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-cijferige code"
                        className="rounded-xl text-center text-lg tracking-widest font-mono"
                        inputMode="numeric"
                      />
                      <Button
                        onClick={async () => {
                          setTwoFALoading(true)
                          const res = await fetch('/api/security/2fa/verify', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: twoFAToken }),
                          })
                          setTwoFALoading(false)
                          if (res.ok) {
                            toast.success('2FA ingeschakeld!')
                            setTwoFA({ enabled: true })
                            setShow2FASetup(false)
                            setTwoFAToken('')
                          } else {
                            toast.error('Ongeldige code')
                          }
                        }}
                        disabled={twoFAToken.length !== 6 || twoFALoading}
                        className="w-full bg-blue-gradient text-white rounded-xl h-11"
                      >
                        {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verifiëren en inschakelen'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={async () => {
                        const res = await fetch('/api/security/2fa/setup', { method: 'POST' })
                        const d = await res.json()
                        setTwoFA({ enabled: false, qrDataUrl: d.qrDataUrl, secret: d.secret })
                        setShow2FASetup(true)
                      }}
                      className="bg-blue-gradient text-white rounded-xl h-11"
                    >
                      <Key className="w-4 h-4 mr-1.5" /> 2FA instellen
                    </Button>
                  )}
                </div>

                <div className="border-t border-[#E4E7EE] pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5 text-[#7C5CFC]" />
                    <div className="font-display font-bold text-lg text-[#0B1B3B]">Vertrouwde apparaten</div>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">Apparaten waarmee je hebt ingelogd.</p>
                  <TrustedDevices />
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}

function TrustedDevices() {
  const [devices, setDevices] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/security/trusted-devices').then((r) => r.json()).then((d) => setDevices(d.devices || []))
  }, [])
  return (
    <div className="space-y-2">
      {devices.length === 0 && <div className="text-xs text-slate-500">Geen vertrouwde apparaten geregistreerd.</div>}
      {devices.map((d) => (
        <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F4F7FB]">
          <div>
            <div className="font-semibold text-sm text-[#0B1B3B]">{d.userAgent.slice(0, 80)}</div>
            <div className="text-xs text-slate-500">IP: {d.ip} · Laatst gezien: {new Date(d.lastSeen).toLocaleDateString('nl-NL')}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
