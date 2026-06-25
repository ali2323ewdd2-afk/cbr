'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, MoreVertical, Ban, ShieldCheck, Trash2, Clock, Loader2 } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionUser, setActionUser] = useState<any | null>(null)
  const pageSize = 15

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    fetch(`/api/admin/users?${params}`).then((r) => r.json()).then((d) => {
      if (cancelled) return
      setUsers(d.users || [])
      setTotal(d.total ?? 0)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [page, search, status])

  async function doAction(action: 'BAN' | 'UNBAN' | 'DELETE' | 'EXTEND_SUB') {
    if (!actionUser) return
    const res = await fetch(`/api/admin/users/${actionUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast.success(`Actie uitgevoerd: ${action}`)
      setActionUser(null)
      setPage(page) // trigger refetch
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)
      fetch(`/api/admin/users?${params}`).then((r) => r.json()).then((d) => {
        setUsers(d.users || [])
        setTotal(d.total ?? 0)
      })
    } else {
      toast.error('Actie mislukt')
    }
  }

  return (
    <AdminShell title="Gebruikersbeheer">
      {/* Filters */}
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-4 mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Zoek gebruiker…"
              className="rounded-xl pl-10"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="active">Actief</SelectItem>
              <SelectItem value="expired">Verlopen</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-slate-500 self-center">{total} gebruikers</div>
        </div>
      </Card>

      {/* Users table */}
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E4E7EE] text-left">
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Gebruiker</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 hidden md:table-cell">Aangemeld</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Abonnement</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Status</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 hidden lg:table-cell">Voortgang</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#E4E7EE]/50 last:border-0 hover:bg-[#F4F7FB]">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-gradient text-white flex items-center justify-center font-bold text-sm">
                          {(u.name ?? 'S')[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#0B1B3B]">{u.name} {u.banned && <span className="text-[#EF4444]">(geblokkeerd)</span>}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 hidden md:table-cell text-sm text-slate-600">
                      {new Date(u.createdAt).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="py-3">
                      <div className="text-sm font-semibold text-[#0B1B3B]">{u.subscription?.plan ?? '—'}</div>
                      {u.subscription?.expiresAt && (
                        <div className="text-xs text-slate-500">tot {new Date(u.subscription.expiresAt).toLocaleDateString('nl-NL')}</div>
                      )}
                    </td>
                    <td className="py-3">
                      {u.subscription?.status === 'ACTIVE' ? <Badge className="bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3] border-0">Actief</Badge> :
                       u.subscription?.status === 'EXPIRED' ? <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2] border-0">Verlopen</Badge> :
                       <Badge className="bg-[#F4F7FB] text-slate-500 hover:bg-[#F4F7FB] border-0">Gast</Badge>}
                    </td>
                    <td className="py-3 hidden lg:table-cell text-sm text-slate-600">
                      <div>{u.stats.lessonsCompleted} lessen · {u.stats.examsTaken} examens</div>
                    </td>
                    <td className="py-3 text-right">
                      <Dialog open={actionUser?.id === u.id} onOpenChange={(o) => setActionUser(o ? u : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl"><MoreVertical className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Acties voor {u.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            {u.banned ? (
                              <Button variant="outline" onClick={() => doAction('UNBAN')} className="w-full justify-start rounded-xl">
                                <ShieldCheck className="w-4 h-4 mr-2 text-[#1FB871]" /> Deblokkeren
                              </Button>
                            ) : (
                              <Button variant="outline" onClick={() => doAction('BAN')} className="w-full justify-start rounded-xl">
                                <Ban className="w-4 h-4 mr-2 text-[#FFB020]" /> Blokkeren
                              </Button>
                            )}
                            <Button variant="outline" onClick={() => doAction('EXTEND_SUB')} className="w-full justify-start rounded-xl">
                              <Clock className="w-4 h-4 mr-2 text-[#2563EB]" /> Abonnement +30 dagen
                            </Button>
                            <Button variant="outline" onClick={() => doAction('DELETE')} className="w-full justify-start rounded-xl text-[#EF4444] hover:text-[#EF4444]">
                              <Trash2 className="w-4 h-4 mr-2" /> Verwijderen
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-5">
              <div className="text-xs text-slate-500">
                Pagina {page} van {Math.ceil(total / pageSize) || 1}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-xl border-[#E4E7EE]">Vorige</Button>
                <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)} className="rounded-xl border-[#E4E7EE]">Volgende</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
