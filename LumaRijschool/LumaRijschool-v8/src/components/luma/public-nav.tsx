'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LumaWordmark } from './logo'
import { useEffect, useState } from 'react'

export function PublicNav() {
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-card' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <LumaWordmark />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/#features" className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B] transition">Functies</Link>
          <Link href="/#pricing" className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B] transition">Prijzen</Link>
          <Link href="/#reviews" className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B] transition">Reviews</Link>
          <Link href="/#faq" className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B] transition">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <Button asChild className="bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl px-4">
              <Link href="/dashboard">Naar dashboard</Link>
            </Button>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-slate-700 hover:text-[#0B1B3B]">
                Inloggen
              </Link>
              <Button asChild className="bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl">
                <Link href="/register">Start gratis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
