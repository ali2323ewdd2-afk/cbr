'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((d: any) => {
      setSettings(d.settings || {})
      // Flatten for editing
      const flat: Record<string, string> = {}
      for (const [cat, items] of Object.entries(d.settings || {})) {
        for (const [k, v] of Object.entries(items as Record<string, string>)) flat[k] = v
      }
      setEditing(flat)
      setLoading(false)
    })
  }, [])

  async function save(key: string, category: string) {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: editing[key] ?? '', category }),
    })
    if (res.ok) toast.success(`${key} opgeslagen`)
    else toast.error(`${key} opslaan mislukt`)
  }

  function setVal(key: string, val: string) {
    setEditing({ ...editing, [key]: val })
  }

  if (loading) return <AdminShell title="Instellingen"><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" /></div></AdminShell>

  const categories = [
    { key: 'GENERAL', label: 'Algemeen', keys: ['SITE_NAME', 'SITE_LOGO', 'SITE_FAVICON', 'SITE_DESCRIPTION', 'REGISTRATION_OPEN'] },
    { key: 'SEO', label: 'SEO', keys: ['META_TITLE', 'META_DESCRIPTION'] },
    { key: 'SOCIAL', label: 'Social', keys: ['FACEBOOK_URL', 'INSTAGRAM_URL', 'YOUTUBE_URL', 'TIKTOK_URL'] },
    { key: 'ANALYTICS', label: 'Analytics', keys: ['GOOGLE_ANALYTICS_ID', 'GOOGLE_TAG_MANAGER_ID'] },
    { key: 'MAINTENANCE', label: 'Maintenance', keys: ['MAINTENANCE_MODE', 'MAINTENANCE_MESSAGE'] },
    { key: 'STRIPE', label: 'Stripe', keys: ['STRIPE_ENABLED'] },
    { key: 'AI', label: 'AI', keys: ['AI_TUTOR_ENABLED'] },
    { key: 'SMTP', label: 'SMTP', keys: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_FROM'] },
  ]

  return (
    <AdminShell title="Instellingen">
      <div className="space-y-5">
        {categories.map((cat) => (
          <Card key={cat.key} className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
            <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">{cat.label}</div>
            <div className="space-y-3">
              {cat.keys.map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-48">
                    <Label className="text-xs font-semibold text-slate-700">{k}</Label>
                  </div>
                  <Input
                    value={editing[k] ?? ''}
                    onChange={(e) => setVal(k, e.target.value)}
                    className="rounded-xl flex-1"
                  />
                  <Button onClick={() => save(k, cat.key)} size="sm" className="rounded-xl bg-blue-gradient text-white">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  )
}
