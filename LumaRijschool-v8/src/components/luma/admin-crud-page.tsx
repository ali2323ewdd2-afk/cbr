'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type AdminRecord = Record<string, unknown> & { id?: string }

type FieldValue = string | number | boolean

export interface AdminField {
  key: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'boolean' | 'select'
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  defaultValue?: FieldValue
}

export interface AdminColumn {
  label: string
  render: (row: AdminRecord) => ReactNode
}

export interface AdminCrudPageProps {
  title: string
  description: string
  endpoint: string
  collectionKey: string
  formTitle: string
  fields: AdminField[]
  columns: AdminColumn[]
  emptyText: string
  createLabel?: string
  searchPlaceholder?: string
  transformSubmit?: (values: Record<string, FieldValue>) => Record<string, unknown>
}

export function AdminCrudPage({
  title,
  description,
  endpoint,
  collectionKey,
  formTitle,
  fields,
  columns,
  emptyText,
  createLabel = 'Nieuw',
  searchPlaceholder = 'Zoeken...',
  transformSubmit,
}: AdminCrudPageProps) {
  const [items, setItems] = useState<AdminRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, FieldValue>>(() => initialForm(fields))

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    params.set('pageSize', '50')
    return `${endpoint}?${params.toString()}`
  }, [endpoint, search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(query)
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error ?? 'Laden mislukt'))
      const collection = data[collectionKey]
      setItems(Array.isArray(collection) ? collection.filter(isAdminRecord) : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Laden mislukt')
    } finally {
      setLoading(false)
    }
  }, [collectionKey, query])

  useEffect(() => {
    void load()
  }, [load])

  function startCreate() {
    setEditingId(null)
    setForm(initialForm(fields))
    setShowForm(true)
  }

  function startEdit(row: AdminRecord) {
    const next = initialForm(fields)
    for (const field of fields) {
      const value = row[field.key]
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        next[field.key] = value
      }
    }
    setEditingId(row.id ?? null)
    setForm(next)
    setShowForm(true)
  }

  async function submit() {
    for (const field of fields) {
      if (field.required && !form[field.key]) {
        toast.error(`${field.label} is verplicht`)
        return
      }
    }
    setSaving(true)
    try {
      const payload = transformSubmit ? transformSubmit(form) : form
      const res = await fetch(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error ?? 'Opslaan mislukt'))
      toast.success(editingId ? 'Bijgewerkt' : 'Aangemaakt')
      setShowForm(false)
      await load()
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  async function remove(row: AdminRecord) {
    if (!row.id) return
    if (!window.confirm('Weet je zeker dat je dit item wilt verwijderen?')) return
    try {
      const res = await fetch(`${endpoint}?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error ?? 'Verwijderen mislukt'))
      toast.success('Verwijderd')
      await load()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Verwijderen mislukt')
    }
  }

  return (
    <AdminShell title={title}>
      <div className="space-y-5">
        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-xl font-bold text-[#0B1B3B]">{title}</div>
              <div className="text-sm text-slate-500">{description}</div>
            </div>
            <Button onClick={startCreate} className="rounded-xl bg-blue-gradient text-white">
              <Plus className="mr-2 h-4 w-4" /> {createLabel}
            </Button>
          </div>
          <div className="mt-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="max-w-md rounded-xl"
            />
          </div>
        </Card>

        {showForm ? (
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-lg font-bold text-[#0B1B3B]">{formTitle}</div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <Label className="text-xs font-semibold text-slate-700">{field.label}</Label>
                  <FieldInput field={field} value={form[field.key]} onChange={(value) => setForm({ ...form, [field.key]: value })} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={submit} disabled={saving} className="rounded-xl bg-blue-gradient text-white">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Opslaan
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div>
          ) : error ? (
            <div className="rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">{emptyText}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E4E7EE] text-left">
                    {columns.map((column) => (
                      <th key={column.label} className="pb-3 text-xs font-semibold uppercase text-slate-500">{column.label}</th>
                    ))}
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id ?? index} className="border-b border-[#E4E7EE]/60 last:border-0">
                      {columns.map((column) => (
                        <td key={column.label} className="py-3 pr-4 text-sm text-[#0B1B3B]">{column.render(item)}</td>
                      ))}
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => startEdit(item)}>Bewerk</Button>
                          <Button variant="ghost" size="sm" className="rounded-xl text-[#EF4444]" onClick={() => void remove(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  )
}

export function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge className={active ? 'border-0 bg-[#ECFDF3] text-[#16A34A]' : 'border-0 bg-slate-100 text-slate-600'}>
      {label}
    </Badge>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AdminField
  value: FieldValue
  onChange: (value: FieldValue) => void
}) {
  if (field.type === 'textarea') {
    return (
      <Textarea
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className="mt-1 rounded-xl"
        rows={4}
      />
    )
  }
  if (field.type === 'boolean') {
    return (
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-[#E4E7EE]"
        />
        Ingeschakeld
      </label>
    )
  }
  if (field.type === 'select') {
    return (
      <select
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Selecteer...</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }
  return (
    <Input
      type={field.type === 'number' ? 'number' : 'text'}
      value={String(value ?? '')}
      onChange={(event) => onChange(field.type === 'number' ? Number(event.target.value) : event.target.value)}
      placeholder={field.placeholder}
      className="mt-1 rounded-xl"
    />
  )
}

function initialForm(fields: AdminField[]) {
  return fields.reduce<Record<string, FieldValue>>((acc, field) => {
    acc[field.key] = field.defaultValue ?? (field.type === 'boolean' ? false : field.type === 'number' ? 0 : '')
    return acc
  }, {})
}

function isAdminRecord(value: unknown): value is AdminRecord {
  return typeof value === 'object' && value !== null
}
