'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface QuestionOption {
  key: string
  text: string
  isCorrect: boolean
  order: number
}

interface QuestionRow {
  id: string
  stem: string
  topicId: string
  lessonId: string | null
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  explanation: string
  imageUrl: string | null
  isPublished: boolean
  topic: { name: string; color: string }
  options: QuestionOption[]
  _count: { answers: number }
}

const blankOptions: QuestionOption[] = ['A', 'B', 'C', 'D'].map((key, order) => ({ key, text: '', isCorrect: key === 'A', order }))

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [bulk, setBulk] = useState('')
  const [form, setForm] = useState({
    topicId: '',
    lessonId: '',
    stem: '',
    explanation: '',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
    imageUrl: '',
    isPublished: true,
    options: blankOptions,
  })

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/questions?search=${encodeURIComponent(search)}&pageSize=50`)
    const data = (await res.json()) as { questions?: QuestionRow[]; error?: string }
    if (!res.ok) toast.error(data.error ?? 'Vragen laden mislukt')
    setQuestions(data.questions ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  function edit(question: QuestionRow) {
    setEditingId(question.id)
    setForm({
      topicId: question.topicId,
      lessonId: question.lessonId ?? '',
      stem: question.stem,
      explanation: question.explanation,
      difficulty: question.difficulty,
      imageUrl: question.imageUrl ?? '',
      isPublished: question.isPublished,
      options: question.options.length === 4 ? question.options : blankOptions,
    })
  }

  async function save() {
    if (!form.topicId || !form.stem || !form.explanation || form.options.some((option) => !option.text)) {
      toast.error('Topic, vraag, uitleg en 4 opties zijn verplicht')
      return
    }
    const res = await fetch('/api/admin/questions', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId ?? undefined,
        topicId: form.topicId,
        lessonId: form.lessonId || null,
        stem: form.stem,
        explanation: form.explanation,
        difficulty: form.difficulty,
        imageUrl: form.imageUrl || null,
        isPublished: form.isPublished,
        tags: [],
        options: form.options,
      }),
    })
    if (res.ok) {
      toast.success(editingId ? 'Vraag bijgewerkt' : 'Vraag toegevoegd')
      setEditingId(null)
      setForm({ topicId: '', lessonId: '', stem: '', explanation: '', difficulty: 'MEDIUM', imageUrl: '', isPublished: true, options: blankOptions })
      await load()
    } else {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? 'Opslaan mislukt')
    }
  }

  async function remove(ids: string[]) {
    if (ids.length === 0) return
    if (!window.confirm(`${ids.length} vraag/vragen verwijderen?`)) return
    const res = await fetch('/api/admin/questions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      toast.success('Vraag verwijderd')
      setSelected([])
      await load()
    } else {
      toast.error('Verwijderen mislukt')
    }
  }

  async function importBulk() {
    try {
      const questions = JSON.parse(bulk) as unknown
      if (!Array.isArray(questions)) throw new Error('Bulk import moet een JSON array zijn')
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk', questions }),
      })
      if (!res.ok) throw new Error('Import mislukt')
      toast.success('Bulk import voltooid')
      setBulk('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import mislukt')
    }
  }

  return (
    <AdminShell title="Vragenbeheer">
      <div className="space-y-5">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-4">{editingId ? 'Vraag bewerken' : 'Nieuwe vraag'}</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })} placeholder="Topic ID" className="rounded-xl" />
          <Input value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })} placeholder="Lesson ID (optioneel)" className="rounded-xl" />
          <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as 'EASY' | 'MEDIUM' | 'HARD' })} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <Input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Afbeelding URL" className="rounded-xl" />
          <Textarea value={form.stem} onChange={(event) => setForm({ ...form, stem: event.target.value })} placeholder="Vraag" className="rounded-xl md:col-span-2" />
          <Textarea value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} placeholder="Uitleg" className="rounded-xl md:col-span-2" />
          {form.options.map((option, index) => (
            <div key={option.key} className="flex gap-2">
              <Input value={option.text} onChange={(event) => setForm({ ...form, options: form.options.map((item, optionIndex) => optionIndex === index ? { ...item, text: event.target.value } : item) })} placeholder={`Optie ${option.key}`} className="rounded-xl" />
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input type="radio" checked={option.isCorrect} onChange={() => setForm({ ...form, options: form.options.map((item, optionIndex) => ({ ...item, isCorrect: optionIndex === index })) })} />
                Correct
              </label>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void save()} className="rounded-xl bg-blue-gradient text-white"><Plus className="mr-2 h-4 w-4" />Opslaan</Button>
          {editingId ? <Button variant="outline" className="rounded-xl" onClick={() => setEditingId(null)}>Annuleer</Button> : null}
        </div>
      </Card>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        <div className="font-display font-bold text-lg text-[#0B1B3B] mb-3">Bulk import</div>
        <Textarea value={bulk} onChange={(event) => setBulk(event.target.value)} placeholder='[{"topicId":"...","stem":"...","explanation":"...","options":[...] }]' className="rounded-xl" rows={4} />
        <Button onClick={() => void importBulk()} variant="outline" className="mt-3 rounded-xl">Importeer JSON</Button>
      </Card>

      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <div className="font-display font-bold text-lg text-[#0B1B3B]">Vragen bank</div>
                <div className="text-xs text-slate-500">{questions.length} vragen geladen</div>
              </div>
              <div className="flex gap-2">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoeken" className="rounded-xl" />
                <Button onClick={() => void load()} className="rounded-xl bg-blue-gradient text-white">Zoek</Button>
                <Button variant="ghost" className="rounded-xl text-[#EF4444]" onClick={() => void remove(selected)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E4E7EE] text-left">
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3"></th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Vraag</th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Onderwerp</th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Moeilijkheid</th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Gebruik</th>
                    <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b border-[#E4E7EE]/50 last:border-0 hover:bg-[#F4F7FB]">
                      <td className="py-3"><input type="checkbox" checked={selected.includes(q.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, q.id] : selected.filter((id) => id !== q.id))} /></td>
                      <td className="py-3 max-w-md">
                        <div className="text-sm text-[#0B1B3B] line-clamp-1">{q.stem}</div>
                      </td>
                      <td className="py-3">
                        <Badge className="border-0 text-white" style={{ backgroundColor: q.topic.color }}>{q.topic.name}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={`border-0 ${
                          q.difficulty === 'EASY' ? 'bg-[#ECFDF3] text-[#16A34A] hover:bg-[#ECFDF3]' :
                          q.difficulty === 'HARD' ? 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]' :
                          'bg-[#FFB020]/10 text-[#B45309] hover:bg-[#FFB020]/10'
                        }`}>{q.difficulty}</Badge>
                      </td>
                      <td className="py-3 text-right text-sm text-slate-600">{q._count.answers}× beantwoord</td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => edit(q)}>Bewerk</Button>
                        <Button size="sm" variant="ghost" className="rounded-xl text-[#EF4444]" onClick={() => void remove([q.id])}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {questions.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">Geen vragen gevonden.</div> : null}
            </div>
          </>
        )}
      </Card>
      </div>
    </AdminShell>
  )
}
