'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface ReviewRow {
  id: string
  rating: number
  review: string | null
  status: string
  isVisible: boolean
  user: { name: string | null; email: string }
  lesson: { title: string } | null
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews?search=${encodeURIComponent(search)}&pageSize=50`)
      const data = (await res.json()) as { reviews?: ReviewRow[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Laden mislukt')
      setReviews(data.reviews ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Laden mislukt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function action(id: string, nextAction: 'APPROVE' | 'REJECT' | 'SHOW' | 'HIDE') {
    const res = await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: nextAction }),
    })
    if (res.ok) {
      toast.success('Review bijgewerkt')
      await load()
    } else {
      toast.error('Actie mislukt')
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Review verwijderen?')) return
    const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Review verwijderd')
      await load()
    } else {
      toast.error('Verwijderen mislukt')
    }
  }

  return (
    <AdminShell title="Reviews">
      <div className="space-y-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="font-display text-xl font-bold text-[#0B1B3B]">Reviews</div>
          <div className="text-sm text-slate-500">Accepteer, wijs af, toon, verberg of verwijder reviews.</div>
          <div className="mt-4 flex gap-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek review of gebruiker" className="max-w-md rounded-xl" />
            <Button onClick={() => void load()} className="rounded-xl bg-blue-gradient text-white">Zoeken</Button>
          </div>
        </Card>
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div> : error ? (
            <div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error}</div>
          ) : reviews.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">Geen reviews gevonden.</div> : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-[#E4E7EE] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-semibold text-[#0B1B3B]">{review.user.name ?? review.user.email} - {review.rating}/5</div>
                      <div className="text-xs text-slate-500">{review.lesson?.title ?? 'Onbekende les'}</div>
                      <div className="mt-2 text-sm text-slate-700">{review.review ?? 'Geen tekst'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-0 bg-slate-100 text-slate-700">{review.status}</Badge>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void action(review.id, 'APPROVE')}>Accepteer</Button>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void action(review.id, 'REJECT')}>Wijs af</Button>
                      <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => void action(review.id, review.isVisible ? 'HIDE' : 'SHOW')}>
                        {review.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-xl text-[#EF4444]" onClick={() => void remove(review.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  )
}
