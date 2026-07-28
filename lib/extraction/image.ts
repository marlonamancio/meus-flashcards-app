import { extractTextFromImage, type ImageMediaType } from './claude-vision'
import type { ExtractionMethod } from './types'

const IMAGE_MEDIA_TYPES: readonly ImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp']

export function isSupportedImageMediaType(mediaType: string): mediaType is ImageMediaType {
  return (IMAGE_MEDIA_TYPES as readonly string[]).includes(mediaType)
}

export async function extractImage(
  buffer: Buffer,
  mediaType: ImageMediaType
): Promise<{ text: string; method: ExtractionMethod }> {
  const text = await extractTextFromImage(buffer.toString('base64'), mediaType)
  return { text: text.trim(), method: 'vision' }
}
