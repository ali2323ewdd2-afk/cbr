'use client'

import { AdminCrudPage, StatusBadge, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminTrafficSignsPage() {
  return (
    <AdminCrudPage
      title="Traffic Signs"
      description="Beheer verkeersborden, afbeeldingen, categorieën en publicatie."
      endpoint="/api/admin/traffic-signs"
      collectionKey="trafficSigns"
      formTitle="Verkeersbord"
      emptyText="Nog geen verkeersborden gevonden."
      fields={[
        { key: 'code', label: 'Code', required: true },
        { key: 'name', label: 'Naam', required: true },
        { key: 'nameEn', label: 'Naam EN' },
        { key: 'nameAr', label: 'Naam AR' },
        { key: 'category', label: 'Categorie', type: 'select', required: true, options: [
          { label: 'Warning', value: 'WARNING' },
          { label: 'Priority', value: 'PRIORITY' },
          { label: 'Prohibitory', value: 'PROHIBITORY' },
          { label: 'Mandatory', value: 'MANDATORY' },
          { label: 'Informational', value: 'INFORMATIONAL' },
        ] },
        { key: 'imageUrl', label: 'Afbeelding URL / upload', type: 'file', uploadKind: 'image', required: true },
        { key: 'description', label: 'Uitleg', type: 'textarea', required: true },
        { key: 'isPublished', label: 'Gepubliceerd', type: 'boolean', defaultValue: true },
      ]}
      columns={[
        { label: 'Code', render: (row) => <div className="font-semibold">{value(row, 'code')}</div> },
        { label: 'Naam', render: (row) => value(row, 'name') },
        { label: 'Categorie', render: (row) => value(row, 'category') },
        { label: 'Afbeelding', render: (row) => value(row, 'imageUrl') ? 'Aanwezig' : 'Geen' },
        { label: 'Status', render: (row) => <StatusBadge active={Boolean(row.isPublished)} label={Boolean(row.isPublished) ? 'Published' : 'Hidden'} /> },
      ]}
    />
  )
}
