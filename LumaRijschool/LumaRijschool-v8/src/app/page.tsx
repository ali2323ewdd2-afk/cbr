'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PublicNav } from '@/components/luma/public-nav'
import { Footer } from '@/components/luma/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Play, Star, ShieldCheck, Brain, Video, TrendingUp, Smartphone, Clock,
  Check, Sparkles, Trophy, Zap, ArrowRight, ChevronRight,
} from 'lucide-react'

const benefits = [
  { icon: ShieldCheck, color: '#2563EB', title: 'CBR-stijl examens', text: 'Oefen in een omgeving die exact lijkt op het echte examen. Geen verrassingen op de examendag.' },
  { icon: Brain, color: '#7C5CFC', title: 'AI-uitleg', text: 'Bij elke fout een directe, begrijpelijke uitleg. Begrijp waarom je het fout had.' },
  { icon: Video, color: '#1FB871', title: 'Video lessen', text: 'Korte video\'s per onderwerp, met snelheid en ondertitels. Precies wat je nodig hebt.' },
  { icon: TrendingUp, color: '#FFB020', title: 'Voortgang bijhouden', text: 'Zie per onderwerp precies waar je staat en waar je nog moet oefenen.' },
  { icon: Smartphone, color: '#FF6B6B', title: 'Mobiel vriendelijk', text: 'Leer overal als app, ook offline. Gewoon op je telefoon.' },
  { icon: Clock, color: '#0284C7', title: '24/7 beschikbaar', text: 'Leer wanneer het jou uitkomt, dag en nacht. Geen afspraken nodig.' },
]

const reviews = [
  { name: 'Sanne K.', city: 'Amsterdam', text: 'In één keer geslaagd! De AI-uitleg maakte het verschil. Eindelijk snapte ik voorrang.', avatar: 'S', color: '#2563EB' },
  { name: 'Jamal R.', city: 'Rotterdam', text: 'De examens lijken precies op het echte CBR. Geen verrassingen op de examendag.', avatar: 'J', color: '#7C5CFC' },
  { name: 'Lisa M.', city: 'Utrecht', text: 'De streak hield me elke dag gemotiveerd. Leren werd bijna een spelletje.', avatar: 'L', color: '#1FB871' },
  { name: 'Daan V.', city: 'Eindhoven', text: 'De study planner was super handig. Wist precies wat ik elke dag moest doen.', avatar: 'D', color: '#FFB020' },
  { name: 'Fatima Z.', city: 'Den Haag', text: 'AI Tutor is goud waard. Stelde vragen en kreeg meteen duidelijke uitleg.', avatar: 'F', color: '#FF6B6B' },
  { name: 'Tom B.', city: 'Groningen', text: 'Eindelijk een platform dat wél op mobiel werkt. Geleerd in de bus naar school.', avatar: 'T', color: '#0284C7' },
]

const steps = [
  { num: 1, title: 'Leer met video', text: 'Bekijk korte videolessen per onderwerp en bouw je kennis op.', color: '#2563EB' },
  { num: 2, title: 'Oefen met examens', text: 'Maak CBR-stijl examens en ontdek precies waar je staat.', color: '#1FB871' },
  { num: 3, title: 'Begrijp je fouten', text: 'AI legt elke fout uit. Van fout naar begrepen in seconden.', color: '#7C5CFC' },
]

const faqs = [
  { q: 'Lijken de examens echt op het CBR?', a: 'Ja. Onze examens gebruiken dezelfde vraagstijl, 40 vragen, 45 minuten en 87,5% slagingsgrens als het echte CBR-theorie-examen. Studenten ervaren geen verrassingen op de examendag.' },
  { q: 'Kan ik gratis beginnen?', a: 'Ja. Als gast krijg je 5 lessen en 2 examens gratis. Daarna kies je een Week- of Month-abonnement voor volledige toegang.' },
  { q: 'Werkt het op mijn telefoon?', a: 'Absoluut. LumaRijschool werkt in elke browser op mobiel, tablet en desktop. Ook als PWA installeerbaar voor offline leren.' },
  { q: 'Kan ik op elk moment opzeggen?', a: 'Ja. Abonnementen lopen automatisch af aan het einde van de periode. Geen verlenging, geen verrassingen.' },
  { q: 'Wat is de AI Tutor?', a: 'Onze AI Tutor beantwoordt al je theorievragen in begrijpelijk Nederlands. Leg een situatie uit, vraag om een oefening of laat een bord uitleggen — 24/7 beschikbaar voor Month-abonnees.' },
  { q: 'Hoe werkt gamification?', a: 'Verdien XP met lessen, examens en streaks. Stijg in level, verdiend badges en klim in het leaderboard. Leren wordt verslavend leuk.' },
]

export default function LandingPage() {
  const [stats, setStats] = useState({
    studentsCount: 45000,
    questionsCount: 2000,
    satisfactionPct: 98,
    available247: true,
  })

  useEffect(() => {
    fetch('/api/landing/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
  }, [])

  const studentsDisplay = stats.studentsCount >= 1000 ? `${Math.round(stats.studentsCount / 1000)}k+` : `${stats.studentsCount}`
  const questionsDisplay = `${stats.questionsCount.toLocaleString('nl-NL')}+`

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] blur-3xl opacity-70" />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#F3EEFF] to-[#E0D8FF] blur-3xl opacity-60" />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF3] border border-[#1FB871]/30 px-3 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#1FB871] animate-pulse-soft" />
              <span className="text-xs font-semibold text-[#15803D]">{studentsDisplay} geslaagde studenten</span>
            </div>
            <h1 className="font-display font-extrabold text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] text-[#0B1B3B] text-balance">
              Leer slimmer.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2563EB] to-[#7C5CFC]">Slaag sneller.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
              Meer dan {questionsDisplay} oefenvragen, CBR-stijl examens en AI-uitleg bij elke fout. Alles om in één keer te slagen.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild className="bg-blue-gradient text-white shadow-luma hover:opacity-90 rounded-xl px-6 h-12 text-base font-semibold">
                <Link href="/register">Bekijk abonnementen <ArrowRight className="ml-1.5 w-4 h-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl h-12 px-6 text-base font-semibold border-[#E4E7EE]">
                <Link href="/dashboard"><Play className="mr-1.5 w-4 h-4" /> Probeer gratis</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#1FB871]" /> Geen creditcard nodig</div>
              <div className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#1FB871]" /> 5 gratis lessen</div>
              <div className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#1FB871]" /> Direct starten</div>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative animate-float">
            <Card className="rounded-3xl border-[#E4E7EE] shadow-luma p-0 overflow-hidden">
              <div className="bg-navy-gradient p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-300 mb-1">Level 8 · 1.540 XP</div>
                    <div className="font-display text-xl font-bold">Welkom terug, Ahmed</div>
                  </div>
                  <Badge className="bg-[#1FB871] text-white hover:bg-[#1FB871] border-0">Examengereed</Badge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#1FB871] to-[#4ADE80] rounded-full" style={{ width: '74%' }} />
                </div>
                <div className="text-xs text-slate-300 mt-1.5">Voortgang 74% · Verder leren</div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-5">
                {[
                  { icon: Trophy, label: 'Badges', value: '7', color: '#FFB020' },
                  { icon: Zap, label: 'Streak', value: '14 dagen', color: '#FF6B6B' },
                  { icon: Sparkles, label: 'Level', value: '8', color: '#7C5CFC' },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl bg-[#F4F7FB] p-3 text-center">
                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-1.5" style={{ backgroundColor: s.color + '20', color: s.color }}>
                      <s.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="font-display font-bold text-sm text-[#0B1B3B]">{s.value}</div>
                    <div className="text-[10px] text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <div className="rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-[#0B1B3B]">Vandaag</div>
                    <div className="text-xs text-[#2563EB] font-semibold">3 lessen · 1 examen</div>
                  </div>
                  <Button className="w-full bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl h-10 text-sm">
                    Verder →
                  </Button>
                </div>
              </div>
            </Card>
            {/* Floating badge */}
            <div className="absolute -top-3 -right-3 rounded-2xl bg-white shadow-luma p-3 border border-[#E4E7EE] animate-pulse-soft">
              <div className="text-2xl">🎯</div>
              <div className="text-[10px] font-semibold text-slate-600 mt-0.5">Perfect!</div>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-3xl bg-navy-gradient p-8 text-white">
            {[
              { label: 'Geslaagde studenten', value: studentsDisplay, sub: '+6% deze maand' },
              { label: 'Oefenvragen', value: questionsDisplay, sub: 'Altijd actueel' },
              { label: 'Tevreden klanten', value: `${stats.satisfactionPct}%`, sub: '★ ★ ★ ★ ★' },
              { label: 'Beschikbaar', value: '24/7', sub: 'Dag en nacht' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-display font-extrabold text-3xl md:text-4xl">{s.value}</div>
                <div className="text-xs text-slate-300 mt-1">{s.label}</div>
                <div className="text-[10px] text-[#5C8BFF] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="features" className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-block text-sm font-semibold text-[#2563EB] mb-3">Waarom LumaRijschool</div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-[#0B1B3B] tracking-tight text-balance">
            Alles wat je nodig hebt om te slagen
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <Card key={i} className="rounded-3xl border-[#E4E7EE] shadow-card hover:shadow-luma-soft transition-all duration-300 hover:-translate-y-1 p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ backgroundColor: b.color + '20', color: b.color }}>
                <b.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0B1B3B] mb-2">{b.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{b.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#F4F7FB] py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <div className="inline-block text-sm font-semibold text-[#2563EB] mb-3">Zo werkt het</div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-[#0B1B3B] tracking-tight text-balance">
              Van eerste les tot geslaagd in 3 stappen
            </h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">Bekijk hoe studenten leren, oefenen en hun fouten begrijpen — alles in één platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <Card key={i} className="rounded-3xl border-0 shadow-card p-7 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: s.color }} />
                <div className="font-display font-extrabold text-7xl text-transparent" style={{ WebkitTextStroke: `2px ${s.color}40` }}>{s.num}</div>
                <h3 className="font-display font-bold text-xl text-[#0B1B3B] mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-10 rounded-3xl bg-navy-gradient overflow-hidden p-8 md:p-12 text-white grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 mb-4">
                <Play className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">2:14 · Introductievideo</span>
              </div>
              <h3 className="font-display font-extrabold text-3xl mb-3 text-balance">Het slimme theorieplatform van Nederland</h3>
              <p className="text-slate-300 text-sm leading-relaxed">Bekijk hoe LumaRijschool je helpt slimmer te leren, je fouten te begrijpen en in één keer te slagen voor het CBR.</p>
              <Button className="mt-5 bg-white text-[#0B1B3B] hover:bg-slate-100 rounded-xl h-11">
                <Play className="mr-1.5 w-4 h-4" /> Bekijk video
              </Button>
            </div>
            <div className="rounded-2xl bg-black/30 aspect-video flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-7 h-7 text-[#2563EB] ml-1" fill="#2563EB" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-block text-sm font-semibold text-[#2563EB] mb-3">Studenten over LumaRijschool</div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-[#0B1B3B] tracking-tight">Wat studenten zeggen</h2>
          <div className="flex items-center justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-[#FFB020]" fill="#FFB020" />)}
            <span className="ml-2 text-sm font-semibold text-slate-600">4.9/5 · 2.847 reviews</span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <Card key={i} className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-[#FFB020]" fill="#FFB020" />)}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-5">"{r.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: r.color }}>
                  {r.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#0B1B3B]">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.city}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-[#F4F7FB] py-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <div className="inline-block text-sm font-semibold text-[#2563EB] mb-3">Abonnementen</div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-[#0B1B3B] tracking-tight text-balance">
              Eenvoudige prijzen, geen verrassingen
            </h2>
            <p className="text-slate-600 mt-3">Kies wat bij je past. Geen verlenging, opzeggen wanneer je wilt.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-7">
              <div className="font-display font-bold text-2xl text-[#0B1B3B]">Week</div>
              <div className="text-sm text-slate-500 mt-1">7 dagen toegang</div>
              <div className="font-display font-extrabold text-5xl text-[#0B1B3B] mt-5">€12,99</div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {['Alle lessen & examens', 'Foutenanalyse', 'Mobiele app', '24/7 beschikbaar'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#1FB871]" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full mt-6 rounded-xl h-12 font-semibold border-[#E4E7EE]">
                <Link href="/register?plan=WEEK">Nu beginnen</Link>
              </Button>
            </Card>
            <Card className="rounded-3xl border-0 shadow-luma p-7 relative overflow-hidden bg-blue-gradient text-white">
              <div className="absolute top-0 right-0 bg-[#FFB020] text-white text-xs font-bold px-3 py-1.5 rounded-bl-2xl">Meest gekozen</div>
              <div className="font-display font-bold text-2xl">Month</div>
              <div className="text-sm text-white/80 mt-1">30 dagen toegang</div>
              <div className="font-display font-extrabold text-5xl mt-5">€29,99</div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {['Alles uit Week', 'AI Tutor onbeperkt', 'Study planner', 'Persoonlijke voortgang', 'Prioriteit support'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-white" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full mt-6 bg-white text-[#2563EB] hover:bg-slate-100 rounded-xl h-12 font-bold shadow-luma-soft">
                <Link href="/register?plan=MONTH">Nu beginnen <ChevronRight className="ml-1 w-4 h-4" /></Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-block text-sm font-semibold text-[#2563EB] mb-3">Veelgestelde vragen</div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-[#0B1B3B] tracking-tight">Alles wat je wilt weten</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border border-[#E4E7EE] rounded-2xl px-5 mb-3 bg-white shadow-sm">
              <AccordionTrigger className="text-left font-semibold text-[#0B1B3B] hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-slate-600 text-sm leading-relaxed pb-5">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-20">
        <div className="rounded-3xl bg-navy-gradient p-10 md:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-[#5C8BFF]/30 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-[#7C5CFC]/30 blur-3xl" />
          <div className="relative">
            <h2 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight text-balance">
              Start gratis vandaag nog
            </h2>
            <p className="text-slate-300 mt-3 max-w-xl mx-auto">Geen creditcard. 5 gratis lessen. Direct toegang tot het slimste theorieplatform van Nederland.</p>
            <Button asChild className="mt-6 bg-white text-[#2563EB] hover:bg-slate-100 rounded-xl h-14 px-8 text-base font-bold shadow-luma">
              <Link href="/register">Start gratis <ArrowRight className="ml-1.5 w-5 h-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}
