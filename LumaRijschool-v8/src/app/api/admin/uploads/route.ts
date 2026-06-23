import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forbiddenResponse, requireAdminSession, serverErrorResponse } from '@/lib/admin-api'
import { storeAdminMedia, type MediaKind } from '@/lib/media-storage'

const kindSchema = z.enum(['image', 'video', 'document'])

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const form = await req.formData()
    const file = form.get('file')
    const kind = kindSchema.parse(form.get('kind') ?? 'image') as MediaKind

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const media = await storeAdminMedia(file, kind)
    return NextResponse.json({ media }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return serverErrorResponse(error)
  }
}
