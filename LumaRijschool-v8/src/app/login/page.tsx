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
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      toast.error('Onjuist e-mailadres of wachtwoord.')
      return
    }
    toast.success('Welkom terug!')
    router.push(from)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="px-6 py-5">
        <Link href="/"><LumaWordmark /></Link>
      </header>
      <div className="flex-1 flex items-center justify-center p-5">
        <Card className="w-full max-w-md rounded-3xl border-[#E4E7EE] shadow-card p-7">
          <h1 className="font-display font-extrabold text-3xl text-[#0B1B3B]">Welkom terug</h1>
          <p className="text-sm text-slate-600 mt-1">Log in om verder te gaan met leren.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 rounded-xl h-11" placeholder="ahmed@email.nl" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Wachtwoord</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={show ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl h-11 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-gradient text-white shadow-luma-soft hover:opacity-90 rounded-xl h-11">
              {loading ? 'Inloggen...' : 'Inloggen'} <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </form>
          <div className="text-xs text-center text-slate-500 mt-4">
            Nog geen account? <Link href="/register" className="text-[#2563EB] font-semibold">Maak gratis account</Link>
          </div>
          <div className="mt-5 rounded-2xl bg-[#F4F7FB] p-3 text-xs text-slate-600">
            <div className="font-semibold text-[#0B1B3B] mb-1">Demo accounts:</div>
            <div>👨‍🎓 Student: <code>ahmed@email.nl</code> / <code>student123</code></div>
            <div>🛠️ Admin: <code>admin@lumarijschool.nl</code> / <code>admin123</code></div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (<Suspense fallback={null}><LoginForm /></Suspense>)
}
