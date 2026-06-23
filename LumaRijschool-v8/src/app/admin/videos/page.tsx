'use client'

import { AdminCrudPage, StatusBadge, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminVideosPage() {
  return (
    <AdminCrudPage
      title="Videos"
      description="Beheer losse video-assets met YouTube, MP4, cover en publicatie."
      endpoint="/api/admin/videos"
      collectionKey="videos"
      formTitle="Video"
      emptyText="Nog geen video's gevonden."
      fields={[
        { key: 'title', label: 'Titel', required: true },
        { key: 'description', label: 'Beschrijving', type: 'textarea' },
        { key: 'youtubeUrl', label: 'Youtube URL' },
        { key: 'mp4Url', label: 'MP4 URL' },
        { key: 'thumbnailUrl', label: 'Cover URL' },
        { key: 'durationSec', label: 'Duur (seconden)', type: 'number', defaultValue: 0 },
        { key: 'isPublished', label: 'Gepubliceerd', type: 'boolean', defaultValue: false },
      ]}
      columns={[
        { label: 'Titel', render: (row) => <div className="font-semibold">{value(row, 'title')}</div> },
        { label: 'Bron', render: (row) => (row.youtubeUrl ? 'YouTube' : 'MP4') },
        { label: 'Duur', render: (row) => `${Math.round(Number(row.durationSec ?? 0) / 60)} min` },
        { label: 'Cover', render: (row) => value(row, 'thumbnailUrl') ? 'Aanwezig' : 'Geen' },
        { label: 'Status', render: (row) => <StatusBadge active={Boolean(row.isPublished)} label={Boolean(row.isPublished) ? 'Published' : 'Draft'} /> },
      ]}
    />
  )
}
