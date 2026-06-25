'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Award, Download } from 'lucide-react'

export default function CertificatesPage() {
  const [certs, setCerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/certificates').then((r) => r.json()).then((d) => {
      setCerts(d.certificates || [])
      setLoading(false)
    })
  }, [])

  return (
    <AppShell title="Certificaten">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Jouw certificaten</div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : certs.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <div className="text-sm text-slate-500">Nog geen certificaten. Voltooi examens en lessen om certificaten te verdienen.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certs.map((c) => (
              <div key={c.id} className="rounded-3xl border-2 border-[#FFB020]/30 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#FFB020]/20 blur-2xl" />
                <div className="relative">
                  <Award className="w-10 h-10 text-[#FFB020] mb-3" />
                  <div className="text-xs text-[#B45309] font-semibold mb-1">CERTIFICAAT #{c.certificateNumber.slice(-8).toUpperCase()}</div>
                  <div className="font-display font-bold text-lg text-[#0B1B3B]">{c.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{c.body}</div>
                  <div className="text-xs text-slate-500 mt-2">Uitgegeven: {new Date(c.issuedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  {c.score && <div className="text-xs text-[#16A34A] font-semibold mt-1">Score: {Math.round(c.score * 100)}%</div>}
                  {c.pdfUrl && (
                    <a href={c.pdfUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="mt-3 rounded-xl border-[#FFB020]/30">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  )
}
