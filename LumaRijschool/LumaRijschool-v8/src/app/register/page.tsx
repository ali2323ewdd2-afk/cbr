'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { LumaWordmark } from '@/components/luma/logo'
import { toast } from 'sonner'
import { Eye, EyeOff, ArrowRight, Check, Zap, Target, Clock } from 'lucide-react'

type Step = 'account' | 'goal' | 'ready'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const planSlug = params.get('plan') || 'MONTH'

  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    studyGoal: 'FAST' as 'FAST' | 'STEADY' | 'EXAMS_ONLY',
    examDate: '',
  })
  const [show, setShow] = useState(false)

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Er ging iets mis. Probeer opnieuw.')
      return
    }
    toast.success('Account aangemaakt! 🎉')
    setStep('goal')
  }

  function continueToReady() {
    if (!form.examDate) {
      const d = new Date(); d.setDate(d.getDate() + 30)
      setForm((f) => ({ ...f, examDate: d.toISOString().slice(0, 10) }))
    }
    setStep('ready')
  }

  async function finish() {
    setLoading(true)
    const r = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    setLoading(false)
    if (r?.error) { toast.error('Login mislukt. Ga naar inloggen.'); router.push('/login'); return }
    if (planSlug === 'MONTH' || planSlug === 'WEEK') {
      const r2 = await fetch('/api/payments/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug }),
      })
      const data = await r2.json()
      if (data.url) { window.location.href = data.url; return }
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="px-6 py-5 flex items-center justify-between">
        <Link href="/"><LumaWordmark /></Link>
        <div className="text-xs text-slate-500">Stap {step === 'account' ? 1 : step === 'goal' ? 2 : 3} van 3</div>
      </header>
      <div className="flex-1 flex items-center justify-center p-5">
        {step === 'account' && (
          <Card className="w-full max-w-md rounded-3xl border-[#E4E7EE] shadow-card p-7">
            <h1 className="font-display font-extrabold text-3xl text-[#0B1B3B]">Maak je gratis account</h1>
            <p className="text-sm text-slate-600 mt-1">Begin met 5 gratis lessen. Geen creditcard nodig.</p>
            <form onSubmit={submitAccount} className="mt-6 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Naam</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 rounded-xl h-11" placeholder="Ahmed Bakkali" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">E-mail</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1.5 rounded-xl h-11" placeholder="ahmed@email.nl" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Telefoon <span className="text-slate-400">(optioneel)</span></Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1.5 rounded-xl h-11" placeholder="+31 6 ..." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Wachtwoord</Label>
                <div className="relative mt-1.5">
                  <Input required type={show ? 'text' : 'password'} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6}
                    className="rounded-xl h-11 pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl h-11">
                {loading ? 'Bezig...' : 'Doorgaan'} <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            </form>
            <div className="text-xs text-center text-slate-500 mt-4">
              Al een account? <Link href="/login" className="text-[#2563EB] font-semibold">Inloggen</Link>
            </div>
          </Card>
        )}

        {step === 'goal' && (
          <Card className="w-full max-w-md rounded-3xl border-[#E4E7EE] shadow-card p-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mb-3">
              <Target className="w-6 h-6" />
            </div>
            <h1 className="font-display font-extrabold text-3xl text-[#0B1B3B]">Wat is jouw doel, {form.name.split(' ')[0]}?</h1>
            <p className="text-sm text-slate-600 mt-1">We stemmen je plan hierop af.</p>
            <div className="mt-6 space-y-3">
              {[
                { id: 'FAST', icon: Zap, title: 'Ik wil snel slagen', sub: 'Intensief, examen dichtbij', color: '#FF6B6B' },
                { id: 'STEADY', icon: Clock, title: 'Ik leer rustig', sub: 'Een beetje elke dag', color: '#2563EB' },
                { id: 'EXAMS_ONLY', icon: Target, title: 'Alleen examens', sub: 'Ik ken de stof al', color: '#7C5CFC' },
              ].map((g) => (
                <button key={g.id} onClick={() => setForm({ ...form, studyGoal: g.id as any })}
                  className={`w-full text-left rounded-2xl border-2 p-4 flex items-center gap-4 transition ${form.studyGoal === g.id ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E4E7EE] hover:border-slate-300'}`}>
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl" style={{ backgroundColor: g.color + '20', color: g.color }}>
                    <g.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#0B1B3B]">{g.title}</div>
                    <div className="text-xs text-slate-500">{g.sub}</div>
                  </div>
                  {form.studyGoal === g.id && <Check className="w-5 h-5 text-[#2563EB]" />}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <Label className="text-xs font-semibold text-slate-700">Wanneer is je examen? <span className="text-slate-400">(optioneel)</span></Label>
              <Input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                className="mt-1.5 rounded-xl h-11" />
            </div>
            <Button onClick={continueToReady} className="w-full mt-6 bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl h-11">
              Doorgaan <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </Card>
        )}

        {step === 'ready' && (
          <Card className="w-full max-w-md rounded-3xl border-[#E4E7EE] shadow-card p-7 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1FB871] to-[#16A34A] text-white text-3xl shadow-luma-soft mb-4 animate-pop">🎯</div>
            <h1 className="font-display font-extrabold text-3xl text-[#0B1B3B]">Je plan is klaar!</h1>
            <p className="text-sm text-slate-600 mt-1">Op basis van je doel en examendatum.</p>
            <div className="rounded-2xl bg-[#F4F7FB] p-4 mt-5 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Examen:</span>
                <span className="font-semibold text-[#0B1B3B]">{form.examDate ? new Date(form.examDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' }) : 'Binnenkort'}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-600">Doel:</span>
                <span className="font-semibold text-[#0B1B3B]">{form.studyGoal === 'FAST' ? 'Snel slagen' : form.studyGoal === 'STEADY' ? 'Rustig leren' : 'Alleen examens'}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-600">Per dag:</span>
                <span className="font-semibold text-[#0B1B3B]">2 lessen · 15 vragen</span>
              </div>
            </div>
            <Button onClick={finish} disabled={loading} className="w-full mt-6 bg-blue-gradient text-white shadow-luma hover:opacity-90 rounded-xl h-12 font-semibold">
              {loading ? 'Bezig...' : 'Start mijn eerste les'} <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
            <div className="text-xs text-slate-500 mt-3">
              {planSlug === 'MONTH' ? 'Je kiest daarna het Month-abonnement voor volledige toegang.' : 'Je kunt direct gratis beginnen.'}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (<Suspense fallback={null}><RegisterForm /></Suspense>)
}
