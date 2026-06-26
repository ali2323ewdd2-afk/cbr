import { describe, expect, it } from 'vitest'
import { validateMedia } from '@/lib/media-storage'

describe('validateMedia', () => {
  it('accepts supported image uploads', () => {
    const file = new File(['image-bytes'], 'sign.png', { type: 'image/png' })
    expect(() => validateMedia(file, 'image')).not.toThrow()
  })

  it('rejects unsupported image MIME types', () => {
    const file = new File(['not-an-image'], 'payload.exe', { type: 'application/x-msdownload' })
    expect(() => validateMedia(file, 'image')).toThrow(/Unsupported image type/)
  })

  it('rejects oversized videos', () => {
    const file = new File(['x'], 'lesson.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 513 * 1024 * 1024 })
    expect(() => validateMedia(file, 'video')).toThrow(/exceeds 512MB/)
  })
})
