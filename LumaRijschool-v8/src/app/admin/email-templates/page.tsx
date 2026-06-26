'use client'

import { AdminCrudPage, StatusBadge, type AdminRecord } from '@/components/luma/admin-crud-page'

function value(row: AdminRecord, key: string) {
  return String(row[key] ?? '')
}

export default function AdminEmailTemplatesPage() {
  return (
    <AdminCrudPage
      title="Email Templates"
      description="Beheer herbruikbare HTML templates voor broadcast en transactionele emails."
      endpoint="/api/admin/email-templates"
      collectionKey="templates"
      formTitle="Email template"
      emptyText="Nog geen email templates gevonden."
      fields={[
        { key: 'name', label: 'Naam', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'subject', label: 'Subject', required: true },
        { key: 'description', label: 'Beschrijving', type: 'textarea' },
        { key: 'html', label: 'HTML', type: 'textarea', required: true },
        { key: 'isActive', label: 'Actief', type: 'boolean', defaultValue: true },
      ]}
      columns={[
        { label: 'Naam', render: (row) => <div className="font-semibold">{value(row, 'name')}</div> },
        { label: 'Slug', render: (row) => value(row, 'slug') },
        { label: 'Subject', render: (row) => value(row, 'subject') },
        { label: 'Status', render: (row) => <StatusBadge active={Boolean(row.isActive)} label={Boolean(row.isActive) ? 'Active' : 'Inactive'} /> },
      ]}
    />
  )
}
