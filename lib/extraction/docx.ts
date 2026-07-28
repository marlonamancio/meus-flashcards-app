import mammoth from 'mammoth'
import type { ExtractionMethod } from './types'

export async function extractDocx(buffer: Buffer): Promise<{ text: string; method: ExtractionMethod }> {
  const result = await mammoth.extractRawText({ buffer })
  return { text: result.value.trim(), method: 'text' }
}
