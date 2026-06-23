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

interface UserRow {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  country: string
  createdAt: string
  banned: boolean
  subscription: { plan: string; status: string; expiresAt: string } | null
  stats: { lessonsCompleted: number; examsTaken: number; payments: number; activityEvents: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionUser, setActionUser] = useState<UserRow | null>(null)
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', password: '' })
  const pageSize = 15

  async function loadUsers(cancelled = false) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    const res = await fetch(`/api/admin/users?${params}`)
    const d = (await res.json()) as { users?: UserRow[]; total?: number }
    if (!cancelled) {
      setUsers(d.users ?? [])
      setTotal(d.total ?? 0)
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void loadUsers(cancelled)
    return () => { cancelled = true }
  }, [page, search, status])

  function openUser(user: UserRow) {
    setActionUser(user)
    setProfile({ name: user.name ?? '', email: user.email, phone: user.phone ?? '', password: '' })
  }

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
      await loadUsers()
    } else {
      toast.error('Actie mislukt')
    }
  }

  async function saveProfile() {
    if (!actionUser) return
    const res = await fetch(`/api/admin/users/${actionUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'UPDATE_PROFILE', name: profile.name, email: profile.email, phone: profile.phone }),
    })
    if (res.ok) {
      toast.success('Gebruiker bijgewerkt')
      await loadUsers()
    } else {
      toast.error('Opslaan mislukt')
    }
  }

  async function changePassword() {
    if (!actionUser || !profile.password) return
    const res = await fetch(`/api/admin/users/${actionUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CHANGE_PASSWORD', password: profile.password }),
    })
    if (res.ok) {
      toast.success('Wachtwoord gewijzigd')
      setProfile({ ...profile, password: '' })
    } else {
      toast.error('Wachtwoord wijzigen mislukt')
    }
  }

  async function loginAs(user: UserRow) {
    const res = await fetch(`/api/admin/login-as/${user.id}`, { method: 'POST' })
    const data = (await res.json()) as { redirectUrl?: string; error?: string }
    if (res.ok && data.redirectUrl) {
      window.location.href = data.redirectUrl
    } else {
      toast.error(data.error ?? 'Login as mislukt')
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
                          <div className="font-semibold text-sm text-[#0B1B3B]">{u.name ?? 'Naamloos'} {u.banned && <span className="text-[#EF4444]">(geblokkeerd)</span>}</div>
                          <div className="text-xs text-slate-500">{u.email} · {u.phone ?? 'geen telefoon'} · {u.role}</div>
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
                      <div>{u.stats.lessonsCompleted} lessen · {u.stats.examsTaken} examens · {u.stats.payments} betalingen</div>
                    </td>
                    <td className="py-3 text-right">
                      <Dialog open={actionUser?.id === u.id} onOpenChange={(o) => (o ? openUser(u) : setActionUser(null))}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => openUser(u)}><MoreVertical className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Acties voor {u.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            <div className="grid gap-2">
                              <Input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Naam" className="rounded-xl" />
                              <Input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder="Email" className="rounded-xl" />
                              <Input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Telefoon" className="rounded-xl" />
                              <Button variant="outline" onClick={() => void saveProfile()} className="w-full justify-start rounded-xl">Profiel opslaan</Button>
                              <Input value={profile.password} onChange={(event) => setProfile({ ...profile, password: event.target.value })} placeholder="Nieuw wachtwoord" type="password" className="rounded-xl" />
                              <Button variant="outline" onClick={() => void changePassword()} className="w-full justify-start rounded-xl">Wachtwoord wijzigen</Button>
                              <Button variant="outline" onClick={() => void loginAs(u)} className="w-full justify-start rounded-xl">Login as gebruiker</Button>
                            </div>
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
            {users.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">Geen gebruikers gevonden.</div> : null}

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
