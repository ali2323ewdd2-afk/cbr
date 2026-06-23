'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AdminShell } from '@/components/luma/admin-shell'
import { Card } from '@/components/ui/card'

interface VideoAnalyticsRow {
  lessonId: string
  title: string
  viewers: number
  averagePositionSec: number
  averageDurationSec: number
  completionRate: number
  events: Record<string, number>
}

export default function AdminVideoAnalyticsPage() {
  const [videos, setVideos] = useState<VideoAnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/video-analytics').then((res) => res.json()).then((data: { videos?: VideoAnalyticsRow[] }) => {
      setVideos(data.videos ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <AdminShell title="Video Analytics">
      <Card className="rounded-3xl border-[#E4E7EE] shadow-card p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /></div> : videos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Nog geen video analytics.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#E4E7EE] text-left">
                <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Les</th>
                <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Viewers</th>
                <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Completion</th>
                <th className="pb-3 text-xs font-semibold uppercase text-slate-500">Events</th>
              </tr></thead>
              <tbody>{videos.map((video) => (
                <tr key={video.lessonId} className="border-b border-[#E4E7EE]/60 last:border-0">
                  <td className="py-3 text-sm font-semibold text-[#0B1B3B]">{video.title}</td>
                  <td className="py-3 text-sm">{video.viewers}</td>
                  <td className="py-3 text-sm">{Math.round(video.completionRate * 100)}%</td>
                  <td className="py-3 text-sm">{Object.entries(video.events).map(([event, count]) => `${event}: ${count}`).join(', ') || '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
