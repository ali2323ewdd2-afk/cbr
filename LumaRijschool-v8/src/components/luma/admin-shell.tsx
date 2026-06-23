'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, FileQuestion, CreditCard, BarChart3,
  LogOut, Menu, TrendingUp, TrendingDown, Bell, Shield, Database,
  MessageSquare, Gift, Settings, Server, RotateCcw, Tag, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LumaLogo } from '@/components/luma/logo'
import { cn } from '@/lib/utils'
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from '@/components/ui/sheet'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Gebruikers', icon: Users },
  { href: '/admin/roles', label: 'Rollen', icon: Shield },
  { href: '/admin/lessons', label: 'Lessen', icon: FileQuestion },
  { href: '/admin/exams', label: 'Examens', icon: FileQuestion },
  { href: '/admin/questions', label: 'Vragen', icon: FileQuestion },
  { href: '/admin/topics', label: 'Topics', icon: Tag },
  { href: '/admin/traffic-signs', label: 'Verkeersborden', icon: Activity },
  { href: '/admin/guests', label: 'Gasten', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/ai-usage', label: 'AI Usage', icon: Server },
  { href: '/admin/subscriptions', label: 'Abonnementen', icon: CreditCard },
  { href: '/admin/plans', label: 'Plans', icon: Tag },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/results', label: 'Resultaten', icon: BarChart3 },
  { href: '/admin/videos', label: 'Videos', icon: Server },
  { href: '/admin/video-analytics', label: 'Video Analytics', icon: BarChart3 },
  { href: '/admin/certificates', label: 'Certificaten', icon: Shield },
  { href: '/admin/emails', label: 'Emails', icon: MessageSquare },
  { href: '/admin/email-templates', label: 'Email Templates', icon: MessageSquare },
  { href: '/admin/notifications', label: 'Notificaties', icon: Bell },
  { href: '/admin/reviews', label: 'Reviews', icon: Tag },
  { href: '/admin/invoices', label: 'Facturen', icon: CreditCard },
  { href: '/admin/refunds', label: 'Terugbetalingen', icon: RotateCcw },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/support', label: 'Support', icon: MessageSquare },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  { href: '/admin/backups', label: 'Backups', icon: Database },
  { href: '/admin/monitoring', label: 'Monitoring', icon: Activity },
  { href: '/admin/security', label: 'Security', icon: Shield },
  { href: '/admin/audit', label: 'Audit Log', icon: Shield },
  { href: '/admin/settings', label: 'Instellingen', icon: Settings },
]

export function AdminShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <Link href="/admin" className="flex items-center gap-2 px-2 mb-6">
        <LumaLogo size={36} />
        <div>
          <div className="font-display font-extrabold text-base text-[#0B1B3B]">
            Luma<span className="text-[#2563EB]">Admin</span>
          </div>
          <div className="text-xs text-slate-500">Beheerderspaneel</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1">
        {nav.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`)
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition',
                active ? 'bg-[#0B1B3B] text-white' : 'text-slate-600 hover:bg-[#F4F7FB] hover:text-[#0B1B3B]',
              )}
            >
              <n.icon className="w-4.5 h-4.5" />
              {n.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-2">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#0B1B3B] px-2">
          ← Terug naar app
        </Link>
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="justify-start gap-3 text-slate-600 hover:text-[#EF4444] font-semibold w-full"
        >
          <LogOut className="w-4 h-4" /> Uitloggen
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-[#E4E7EE] p-4 fixed h-screen">
        {SidebarContent}
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#E4E7EE] px-4 h-14 flex items-center justify-between">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl"><Menu className="w-5 h-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              {SidebarContent}
            </SheetContent>
          </Sheet>
          <div className="font-display font-extrabold text-base text-[#0B1B3B]">Luma Admin</div>
          <div className="w-8 h-8 rounded-full bg-[#0B1B3B] text-white flex items-center justify-center font-bold text-sm">
            {(session?.user?.name ?? 'A')[0]}
          </div>
        </header>

        <header className="hidden lg:flex sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#E4E7EE] px-8 h-16 items-center justify-between">
          <h1 className="font-display font-bold text-xl text-[#0B1B3B]">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#ECFDF3] text-[#16A34A] px-3 py-1.5 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1FB871] animate-pulse-soft" /> 342 online
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="rounded-xl border-[#E4E7EE]">Naar app</Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
