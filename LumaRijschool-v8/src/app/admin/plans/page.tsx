'use client'

import { AdminCrudPage, StatusBadge, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminPlansPage() {
  return (
    <AdminCrudPage
      title="Plans"
      description="Beheer prijzen, looptijd, Stripe Price IDs en zichtbaarheid van abonnementen."
      endpoint="/api/admin/plans"
      collectionKey="plans"
      formTitle="Plan"
      emptyText="Nog geen plans gevonden."
      fields={[
        { key: 'name', label: 'Naam', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'description', label: 'Beschrijving', type: 'textarea', required: true },
        { key: 'priceCents', label: 'Prijs in centen', type: 'number', defaultValue: 0 },
        { key: 'currency', label: 'Valuta', defaultValue: 'EUR' },
        { key: 'durationDays', label: 'Duur in dagen', type: 'number', defaultValue: 30 },
        { key: 'stripePriceId', label: 'Stripe Price ID' },
        { key: 'features', label: 'Features JSON', type: 'textarea', defaultValue: '[]' },
        { key: 'isPopular', label: 'Populair', type: 'boolean', defaultValue: false },
        { key: 'isActive', label: 'Actief', type: 'boolean', defaultValue: true },
      ]}
      columns={[
        { label: 'Plan', render: (row) => <div className="font-semibold">{value(row, 'name')}</div> },
        { label: 'Prijs', render: (row) => `${(Number(row.priceCents ?? 0) / 100).toFixed(2)} ${value(row, 'currency')}` },
        { label: 'Duur', render: (row) => `${value(row, 'durationDays')} dagen` },
        {
          label: 'Gebruik',
          render: (row) => {
            const count = row._count as { subscriptions?: number; payments?: number } | undefined
            return `${count?.subscriptions ?? 0} subs / ${count?.payments ?? 0} payments`
          },
        },
        { label: 'Status', render: (row) => <StatusBadge active={Boolean(row.isActive)} label={Boolean(row.isActive) ? 'Active' : 'Inactive'} /> },
      ]}
    />
  )
}
