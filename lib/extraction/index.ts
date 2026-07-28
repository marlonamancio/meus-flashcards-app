import { chunkText } from './chunk'
import { extractDocx } from './docx'
import { isSupportedImageMediaType, extractImage } from './image'
import { extractPdf } from './pdf'
import { extractPptx } from './pptx'
import { sanitizeExtractedText } from './sanitize'
import type { ExtractedContent, MaterialTipo } from './types'

export type { ExtractedContent, ExtractionMethod, MaterialTipo } from './types'
export { materialTipoFromFile } from './material-tipo'

export async function extractContent(buffer: Buffer, tipo: MaterialTipo, mimeType: string): Promise<ExtractedContent> {
  const result = await extractByTipo(buffer, tipo, mimeType)
  // Applied here, once, for every file type — not per-extractor — so a rule added later (see
  // lib/extraction/sanitize.ts) automatically covers PDF/docx/pptx/image without touching this
  // dispatcher again.
  const sanitizedText = sanitizeExtractedText(result.text)

  return {
    fullText: sanitizedText,
    chunks: chunkText(sanitizedText),
    method: result.method,
  }
}

function extractByTipo(buffer: Buffer, tipo: MaterialTipo, mimeType: string) {
  switch (tipo) {
    case 'pdf':
      return extractPdf(buffer)
    case 'image':
      return extractImage(buffer, isSupportedImageMediaType(mimeType) ? mimeType : 'image/jpeg')
    case 'docx':
      return extractDocx(buffer)
    case 'pptx':
      return extractPptx(buffer)
  }
}
