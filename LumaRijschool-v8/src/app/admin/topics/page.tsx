'use client'

import { AdminCrudPage, StatusBadge, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminTopicsPage() {
  return (
    <AdminCrudPage
      title="Topics"
      description="Beheer categorieën, volgorde, iconen en publicatie."
      endpoint="/api/admin/topics"
      collectionKey="topics"
      formTitle="Topic"
      emptyText="Nog geen topics gevonden."
      fields={[
        { key: 'name', label: 'Naam', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'nameEn', label: 'Naam EN' },
        { key: 'color', label: 'Kleur', defaultValue: '#2563EB' },
        { key: 'iconKey', label: 'Icon' },
        { key: 'imageUrl', label: 'Afbeelding URL / upload', type: 'file', uploadKind: 'image' },
        { key: 'order', label: 'Volgorde', type: 'number', defaultValue: 0 },
        { key: 'description', label: 'Beschrijving', type: 'textarea' },
        { key: 'isPublished', label: 'Gepubliceerd', type: 'boolean', defaultValue: true },
      ]}
      columns={[
        { label: 'Naam', render: (row) => <div className="font-semibold">{value(row, 'name')}</div> },
        { label: 'Slug', render: (row) => value(row, 'slug') },
        { label: 'Volgorde', render: (row) => value(row, 'order') },
        {
          label: 'Status',
          render: (row) => <StatusBadge active={Boolean(row.isPublished)} label={Boolean(row.isPublished) ? 'Published' : 'Hidden'} />,
        },
        {
          label: 'Items',
          render: (row) => {
            const count = row._count as { lessons?: number; questions?: number } | undefined
            return `${count?.lessons ?? 0} lessen / ${count?.questions ?? 0} vragen`
          },
        },
      ]}
    />
  )
}
