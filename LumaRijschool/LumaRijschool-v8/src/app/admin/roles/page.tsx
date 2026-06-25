'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, Users } from 'lucide-react'

export default function AdminRolesPage() {
  const [data, setData] = useState<{ roles: any[]; rolePermissions: any } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/roles').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  return (
    <AdminShell title="Rollen & Permissies">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#2563EB]" />
          <div className="font-display font-bold text-lg text-[#0B1B3B]">Systeem rollen</div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.roles.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#E4E7EE] p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF] border-0">{r.slug}</Badge>
                  {r.isSystem && <span className="text-xs text-slate-400">System</span>}
                </div>
                <div className="font-semibold text-sm text-[#0B1B3B]">{r.name}</div>
                <div className="text-xs text-slate-500 mt-1">{r.description}</div>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {r._count.users} gebruikers</span>
                  <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3" /> {r._count.permissions} permissies</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">Permissie matrix</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E4E7EE]">
                <th className="text-left font-semibold text-slate-500 uppercase pb-3 pr-4">Permissie</th>
                {data?.roles.map((r) => (
                  <th key={r.id} className="text-center font-semibold text-slate-500 uppercase pb-3 px-2">{r.slug}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(data?.rolePermissions || {}).map(([role, perms]: [string, any]) => {
                if (role === 'ADMIN' || role === 'SUPER_ADMIN') return null
                return (perms as string[]).map((p, i) => (
                  <tr key={`${role}-${p}`} className="border-b border-[#E4E7EE]/50">
                    <td className="py-2 pr-4 font-mono text-slate-700">{p}</td>
                    {data?.roles.map((r) => {
                      const rp = data.rolePermissions[r.slug] || []
                      const has = rp.includes(p) || rp.includes('*')
                      return <td key={r.id} className="text-center py-2">{has ? <span className="text-[#16A34A]">✓</span> : <span className="text-slate-300">—</span>}</td>
                    })}
                  </tr>
                ))
              }).flat()}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
