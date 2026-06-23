'use client'

import { AdminCrudPage, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminCertificatesPage() {
  return (
    <AdminCrudPage
      title="Certificates"
      description="Beheer certificaten, PDF-links en heruitgifte."
      endpoint="/api/admin/certificates"
      collectionKey="certificates"
      formTitle="Certificaat"
      emptyText="Nog geen certificaten gevonden."
      fields={[
        { key: 'userId', label: 'User ID', required: true },
        { key: 'title', label: 'Titel', required: true },
        { key: 'body', label: 'Tekst', type: 'textarea', required: true },
        { key: 'score', label: 'Score (0-1)', type: 'number', defaultValue: 0 },
        { key: 'lessonId', label: 'Lesson ID' },
        { key: 'examAttemptId', label: 'Exam attempt ID' },
        { key: 'pdfUrl', label: 'PDF URL' },
      ]}
      columns={[
        {
          label: 'Student',
          render: (row) => {
            const user = row.user as { name?: string; email?: string } | null | undefined
            return user?.name ?? user?.email ?? value(row, 'userId')
          },
        },
        { label: 'Titel', render: (row) => <div className="font-semibold">{value(row, 'title')}</div> },
        { label: 'Nummer', render: (row) => value(row, 'certificateNumber') },
        { label: 'PDF', render: (row) => value(row, 'pdfUrl') ? 'Beschikbaar' : 'Geen PDF' },
        { label: 'Uitgegeven', render: (row) => new Date(String(row.issuedAt)).toLocaleDateString('nl-NL') },
      ]}
    />
  )
}
