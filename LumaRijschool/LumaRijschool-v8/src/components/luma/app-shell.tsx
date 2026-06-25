'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BookOpen, FileText, Bot, CalendarDays, User,
  LogOut, Bell, Menu, X, Sparkles, Flame, Trophy, Zap, Gift, MessageSquare,
  Search, TrafficCone, Award, MessageCircle, Disc, Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LumaLogo } from './logo'
import { cn } from '@/lib/utils'
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from '@/components/ui/sheet'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lessons', label: 'Lessen', icon: BookOpen },
  { href: '/exams', label: 'Examens', icon: FileText },
  { href: '/tutor', label: 'AI Tutor', icon: Bot },
  { href: '/planner', label: 'Planner', icon: CalendarDays },
  { href: '/search', label: 'Zoeken', icon: Search },
  { href: '/chat', label: 'Live Chat', icon: MessageCircle },
  { href: '/challenges', label: 'Challenges', icon: Trophy },
  { href: '/mystery-box', label: 'Mystery Box', icon: Sparkles },
  { href: '/spin-wheel', label: 'Spin Wheel', icon: Disc },
  { href: '/avatar-shop', label: 'Avatar Shop', icon: Palette },
  { href: '/referral', label: 'Referral', icon: Gift },
  { href: '/traffic-signs', label: 'Borden', icon: TrafficCone },
  { href: '/certificates', label: 'Certificaten', icon: Award },
  { href: '/support', label: 'Support', icon: MessageSquare },
  { href: '/profile', label: 'Profiel', icon: User },
]

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [unread, setUnread] = useState(0)
  const [xp, setXp] = useState<number | null>(null)
  const [streak, setStreak] = useState<number | null>(null)
  const [level, setLevel] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/notifications').then((r) => r.json()).catch(() => ({ unreadCount: 0 })),
      fetch('/api/dashboard').then((r) => r.json()).catch(() => null),
    ]).then(([n, d]) => {
      setUnread(n?.unreadCount ?? 0)
      if (d?.gamification) {
        setXp(d.gamification.totalXp)
        setStreak(d.gamification.streak)
        setLevel(d.gamification.level)
      }
    })
  }, [pathname])

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-6">
        <LumaLogo size={36} />
        <span className="font-display font-extrabold text-lg text-[#0B1B3B]">
          Luma<span className="text-[#2563EB]">Rijschool</span>
        </span>
      </Link>

      {/* XP card */}
      {xp !== null && (
        <div className="rounded-2xl bg-navy-gradient p-3.5 mb-4 text-white">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Level {level}</span>
            <span className="inline-flex items-center gap-1 font-semibold">
              <Zap className="w-3 h-3 text-[#FFB020]" /> {xp.toLocaleString('nl-NL')} XP
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FFB020] to-[#FF6B6B] rounded-full" style={{ width: '60%' }} />
          </div>
          {streak !== null && streak > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[#FFB020]">
              <Flame className="w-3.5 h-3.5" /> {streak} dagen streak
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {nav.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + '/')
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition',
                active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-slate-600 hover:bg-[#F4F7FB] hover:text-[#0B1B3B]',
              )}
            >
              <n.icon className="w-4.5 h-4.5" />
              {n.label}
            </Link>
          )
        })}
      </nav>

      <Button
        variant="ghost"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="justify-start gap-3 text-slate-600 hover:text-[#EF4444] font-semibold"
      >
        <LogOut className="w-4 h-4" /> Uitloggen
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-[#E4E7EE] p-4 fixed h-screen">
        {SidebarContent}
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#E4E7EE] px-4 h-14 flex items-center justify-between">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              {SidebarContent}
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center gap-2">
            <LumaLogo size={28} />
            <span className="font-display font-extrabold text-base text-[#0B1B3B]">LumaRijschool</span>
          </Link>
          <Link href="/dashboard" className="relative">
            <Bell className="w-5 h-5 text-slate-600" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#E4E7EE] px-8 h-16 items-center justify-between">
          <h1 className="font-display font-bold text-xl text-[#0B1B3B]">{title}</h1>
          <div className="flex items-center gap-3">
            <Link href="/tutor" className="hidden md:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#5C8BFF] text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90">
              <Sparkles className="w-3.5 h-3.5" /> Vraag Luma AI
            </Link>
            <Link href="/dashboard" className="relative">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Bell className="w-5 h-5 text-slate-600" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/profile" className="w-9 h-9 rounded-full bg-blue-gradient text-white flex items-center justify-center font-bold text-sm">
              {(session?.user?.name ?? 'S')[0].toUpperCase()}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
