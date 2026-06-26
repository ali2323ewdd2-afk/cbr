import { mkdir, writeFile } from 'fs/promises'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_BYTES = 512 * 1024 * 1024
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

const allowedTypes = {
  image: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  video: new Set(['video/mp4', 'video/webm', 'video/quicktime']),
  document: new Set(['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']),
}

export type MediaKind = keyof typeof allowedTypes

export interface StoredMedia {
  fileName: string
  url: string
  fileUrl: string
  mimeType: string
  sizeBytes: number
}

export function validateMedia(file: File, kind: MediaKind) {
  const maxBytes = kind === 'video' ? MAX_VIDEO_BYTES : kind === 'document' ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES
  if (!allowedTypes[kind].has(file.type)) {
    throw new Error(`Unsupported ${kind} type: ${file.type || 'unknown'}`)
  }
  if (file.size <= 0) {
    throw new Error('Uploaded file is empty')
  }
  if (file.size > maxBytes) {
    throw new Error(`Uploaded file exceeds ${Math.round(maxBytes / 1024 / 1024)}MB`)
  }
}

export async function storeAdminMedia(file: File, kind: MediaKind): Promise<StoredMedia> {
  validateMedia(file, kind)

  const uploadRoot = join(process.cwd(), 'public', 'uploads', 'admin', kind)
  await mkdir(uploadRoot, { recursive: true })

  const originalExt = extname(file.name).toLowerCase()
  const extension = originalExt || extensionForMime(file.type)
  const safeBase = file.name
    .replace(extension, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || kind
  const fileName = `${safeBase}-${randomUUID()}${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())
  await writeFile(join(uploadRoot, fileName), bytes)

  const url = `/uploads/admin/${kind}/${fileName}`
  return {
    fileName,
    url,
    fileUrl: url,
    mimeType: file.type,
    sizeBytes: file.size,
  }
}

function extensionForMime(mime: string) {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'image/svg+xml') return '.svg'
  if (mime === 'video/webm') return '.webm'
  if (mime === 'video/quicktime') return '.mov'
  if (mime === 'application/pdf') return '.pdf'
  if (mime === 'text/plain') return '.txt'
  return mime.startsWith('video/') ? '.mp4' : '.jpg'
}
