'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Paperclip, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AdminShell } from '@/components/luma/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface Attachment {
  fileName: string
  fileUrl: string
  mimeType: string
  sizeBytes: number
}

interface Reply {
  id: string
  body: string
  isStaff: boolean
  createdAt: string
  user: { name: string | null; role: string }
  attachments: Attachment[]
}

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  category: string
  body: string
  createdAt: string
  user: { name: string | null; email: string }
  replies: Reply[]
  attachments: Attachment[]
}

export default function AdminSupportTicketPage() {
  const params = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/support/${params.id}`)
    const data = (await res.json()) as { ticket?: Ticket; error?: string }
    if (res.ok) setTicket(data.ticket ?? null)
    else toast.error(data.error ?? 'Ticket laden mislukt')
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [params.id])

  async function upload(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('kind', 'document')
      const res = await fetch('/api/admin/uploads', { method: 'POST', body })
      const data = (await res.json()) as { media?: Attachment; error?: string }
      if (!res.ok || !data.media) throw new Error(data.error ?? 'Upload mislukt')
      setAttachments([...attachments, data.media])
      toast.success('Bijlage toegevoegd')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload mislukt')
    } finally {
      setUploading(false)
    }
  }

  async function submit(action?: 'CLOSE' | 'RESOLVE' | 'REOPEN') {
    if (!reply.trim() && !action) {
      toast.error('Schrijf een antwoord of kies een actie')
      return
    }
    const res = await fetch(`/api/admin/support/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply.trim() || undefined, action, attachments }),
    })
    if (res.ok) {
      toast.success('Ticket bijgewerkt')
      setReply('')
      setAttachments([])
      await load()
    } else {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? 'Opslaan mislukt')
    }
  }

  return (
    <AdminShell title="Support ticket">
      <div className="space-y-5">
        <Link href="/admin/support" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B1B3B]">
          <ArrowLeft className="h-4 w-4" /> Terug naar tickets
        </Link>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" /></div>
        ) : !ticket ? (
          <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-8 text-center text-sm text-slate-500">Ticket niet gevonden.</Card>
        ) : (
          <>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#0B1B3B]">{ticket.subject}</h2>
                  <div className="mt-1 text-sm text-slate-500">{ticket.user.name ?? ticket.user.email} - {ticket.category} - {new Date(ticket.createdAt).toLocaleString('nl-NL')}</div>
                </div>
                <Badge className="border-0 bg-[#EFF6FF] text-[#2563EB]">{ticket.status}</Badge>
              </div>
              <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-[#F4F7FB] p-4 text-sm text-slate-700">{ticket.body}</div>
              <AttachmentList attachments={ticket.attachments} />
            </Card>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <div className="space-y-4">
                {ticket.replies.length === 0 ? <div className="text-center text-sm text-slate-500">Nog geen antwoorden.</div> : ticket.replies.map((item) => (
                  <div key={item.id} className={`rounded-2xl border p-4 ${item.isStaff ? 'border-[#2563EB]/20 bg-[#EFF6FF]' : 'border-[#E4E7EE]'}`}>
                    <div className="mb-2 text-xs font-semibold text-slate-500">{item.user.name ?? item.user.role} - {new Date(item.createdAt).toLocaleString('nl-NL')}</div>
                    <div className="whitespace-pre-wrap text-sm text-[#0B1B3B]">{item.body}</div>
                    <AttachmentList attachments={item.attachments} />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
              <Textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={5} className="rounded-xl" placeholder="Schrijf een antwoord..." />
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <input
                    type="file"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void upload(file)
                    }}
                  />
                  <AttachmentList attachments={attachments} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => void submit('REOPEN')}>Heropen</Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => void submit('RESOLVE')}>Resolve</Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => void submit('CLOSE')}>Sluiten</Button>
                  <Button className="rounded-xl bg-blue-gradient text-white" onClick={() => void submit()}><Send className="mr-2 h-4 w-4" />Antwoord</Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  )
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <a key={attachment.fileUrl} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-semibold text-[#2563EB]">
          <Paperclip className="h-3 w-3" /> {attachment.fileName}
        </a>
      ))}
    </div>
  )
}
