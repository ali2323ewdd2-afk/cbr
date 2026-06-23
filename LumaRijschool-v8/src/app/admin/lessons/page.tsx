'use client'

import { AdminCrudPage, StatusBadge, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminLessonsPage() {
  return (
    <AdminCrudPage
      title="Lessons"
      description="Beheer lessen, video, preview, volgorde en publicatie."
      endpoint="/api/admin/lessons"
      collectionKey="lessons"
      formTitle="Les"
      emptyText="Nog geen lessen gevonden."
      fields={[
        { key: 'title', label: 'Titel', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'topicId', label: 'Topic ID', required: true },
        { key: 'summary', label: 'Preview / samenvatting', required: true },
        { key: 'description', label: 'Beschrijving', type: 'textarea', required: true },
        { key: 'videoUrl', label: 'Video URL / upload', type: 'file', uploadKind: 'video' },
        { key: 'thumbnailUrl', label: 'Afbeelding URL / upload', type: 'file', uploadKind: 'image' },
        { key: 'durationSec', label: 'Duur (seconden)', type: 'number', defaultValue: 0 },
        { key: 'order', label: 'Volgorde', type: 'number', defaultValue: 0 },
        { key: 'isFree', label: 'Gratis', type: 'boolean', defaultValue: false },
        { key: 'isPublished', label: 'Gepubliceerd', type: 'boolean', defaultValue: true },
      ]}
      columns={[
        { label: 'Les', render: (row) => <div className="font-semibold">{value(row, 'title')}</div> },
        {
          label: 'Topic',
          render: (row) => {
            const topic = row.topic as { name?: string } | undefined
            return topic?.name ?? value(row, 'topicId')
          },
        },
        { label: 'Duur', render: (row) => `${Math.round(Number(row.durationSec ?? 0) / 60)} min` },
        { label: 'Prijs', render: (row) => <StatusBadge active={Boolean(row.isFree)} label={Boolean(row.isFree) ? 'Free' : 'Paid'} /> },
        {
          label: 'Status',
          render: (row) => <StatusBadge active={Boolean(row.isPublished)} label={Boolean(row.isPublished) ? 'Published' : 'Hidden'} />,
        },
      ]}
    />
  )
}
