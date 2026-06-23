'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LumaWordmark } from '@/components/luma/logo'
import { Wrench } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FB] p-5 text-center">
      <Link href="/" className="mb-8"><LumaWordmark /></Link>
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-gradient text-white shadow-luma mb-6 animate-float">
        <Wrench className="w-10 h-10" />
      </div>
      <h1 className="font-display font-extrabold text-4xl text-[#0B1B3B]">Onderhoud</h1>
      <p className="text-slate-600 mt-3 max-w-md">
        LumaRijschool is momenteel in onderhoud. We zijn zo snel mogelijk terug. Bedankt voor je geduld!
      </p>
      <p className="text-xs text-slate-400 mt-6">Vragen? Email support@lumarijschool.nl</p>
    </div>
  )
}
