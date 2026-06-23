'use client'

import Link from 'next/link'
import { AdminCrudPage, StatusBadge, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminExamsPage() {
  return (
    <AdminCrudPage
      title="Exams"
      description="Beheer oefen-, mock- en officiële examens met publicatie."
      endpoint="/api/admin/exams"
      collectionKey="exams"
      formTitle="Examen"
      emptyText="Nog geen examens gevonden."
      fields={[
        { key: 'title', label: 'Titel', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'description', label: 'Beschrijving', type: 'textarea', required: true },
        { key: 'type', label: 'Type', type: 'select', defaultValue: 'MOCK', options: [
          { label: 'Practice', value: 'PRACTICE' },
          { label: 'Mock', value: 'MOCK' },
          { label: 'Official', value: 'OFFICIAL' },
        ] },
        { key: 'durationSec', label: 'Tijd (seconden)', type: 'number', defaultValue: 2700 },
        { key: 'passingScore', label: 'Slagingspercentage (0-1)', type: 'number', defaultValue: 0.875 },
        { key: 'questionCount', label: 'Aantal vragen', type: 'number', defaultValue: 40 },
        { key: 'randomQuestions', label: 'Random questions', type: 'boolean', defaultValue: false },
        { key: 'isFree', label: 'Gratis', type: 'boolean', defaultValue: false },
        { key: 'isPublished', label: 'Gepubliceerd', type: 'boolean', defaultValue: false },
      ]}
      transformSubmit={(values) => ({ ...values, tags: [] })}
      columns={[
        { label: 'Examen', render: (row) => <Link href={`/admin/exams/${row.id}`} className="font-semibold text-[#2563EB] hover:underline">{value(row, 'title')}</Link> },
        { label: 'Type', render: (row) => value(row, 'type') },
        { label: 'Vragen', render: (row) => value(row, 'questionCount') },
        { label: 'Tijd', render: (row) => `${Math.round(Number(row.durationSec ?? 0) / 60)} min` },
        { label: 'Status', render: (row) => <StatusBadge active={Boolean(row.isPublished)} label={Boolean(row.isPublished) ? 'Published' : 'Draft'} /> },
      ]}
    />
  )
}
