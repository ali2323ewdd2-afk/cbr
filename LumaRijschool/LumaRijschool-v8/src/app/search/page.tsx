'use client'

import { useEffect, useState, useRef } from 'react'
import { AppShell } from '@/components/luma/app-shell'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, BookOpen, FileText, HelpCircle, TrafficCone, Loader2, X, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const TYPE_ICONS: Record<string, any> = {
  lesson: BookOpen,
  exam: FileText,
  question: HelpCircle,
  sign: TrafficCone,
  faq: HelpCircle,
}

const TYPE_LABELS: Record<string, string> = {
  lesson: 'Les',
  exam: 'Examen',
  question: 'Vraag',
  sign: 'Verkeersbord',
  faq: 'FAQ',
}

const TYPE_COLORS: Record<string, string> = {
  lesson: '#2563EB',
  exam: '#7C5CFC',
  question: '#FFB020',
  sign: '#FF6B6B',
  faq: '#1FB871',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [popular, setPopular] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    Promise.all([
      fetch('/api/popular-searches').then((r) => r.json()),
      fetch('/api/search-history').then((r) => r.json()).catch(() => ({ history: [] })),
    ]).then(([p, h]) => {
      setPopular(p.popular || [])
      setHistory(h.history || [])
    })
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      // Clear stale results when the query becomes too short to search.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      return
    }
    const q = query
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const d = await res.json()
        setResults(d.results || [])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <AppShell title="Zoeken">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek lessen, examens, vragen, verkeersborden..."
            className="rounded-xl pl-12 pr-10 h-12 text-base"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#2563EB]" />
          )}
        </div>
      </Card>

      {/* Popular searches when no query */}
      {!query && (
        <div className="space-y-5">
          {history.length > 0 && (
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="font-display font-bold text-base text-[#0B1B3B] mb-3">Recente zoekopdrachten</div>
              <div className="flex flex-wrap gap-2">
                {history.map((h, i) => (
                  <button key={i} onClick={() => setQuery(h)} className="rounded-full bg-[#F4F7FB] hover:bg-[#EFF6FF] px-3 py-1.5 text-sm font-semibold text-slate-700">
                    {h}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {popular.length > 0 && (
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#FFB020]" />
                <div className="font-display font-bold text-base text-[#0B1B3B]">Populaire zoekopdrachten</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {popular.map((p, i) => (
                  <button key={i} onClick={() => setQuery(p)} className="rounded-full bg-[#FFB020]/10 hover:bg-[#FFB020]/20 px-3 py-1.5 text-sm font-semibold text-[#B45309]">
                    {p}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Results */}
      {query && (
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display font-bold text-base text-[#0B1B3B] mb-4">
            {results.length} resultaten voor "{query}"
          </div>
          {results.length === 0 && !loading ? (
            <div className="text-center py-8">
              <Search className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <div className="text-sm text-slate-500">Geen resultaten gevonden. Probeer een andere zoekterm.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => {
                const Icon = TYPE_ICONS[r.type] || HelpCircle
                const color = TYPE_COLORS[r.type] || '#2563EB'
                return (
                  <Link key={`${r.type}-${r.id}`} href={r.url} className="block rounded-2xl p-4 hover:bg-[#F4F7FB] border border-[#E4E7EE] transition">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: color + '20', color }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="border-0 text-xs" style={{ backgroundColor: color + '20', color }}>{TYPE_LABELS[r.type] || r.type}</Badge>
                          {r.subtitle && <span className="text-xs text-slate-500">{r.subtitle}</span>}
                        </div>
                        <div className="font-semibold text-sm text-[#0B1B3B] line-clamp-2">{r.title}</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      )}
    </AppShell>
  )
}
