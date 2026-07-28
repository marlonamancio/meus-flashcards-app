import { chunkText } from './chunk'
import { extractDocx } from './docx'
import { isSupportedImageMediaType, extractImage } from './image'
import { extractPdf } from './pdf'
import { extractPptx } from './pptx'
import type { ExtractedContent, MaterialTipo } from './types'

export type { ExtractedContent, ExtractionMethod, MaterialTipo } from './types'
export { materialTipoFromFile } from './material-tipo'

export async function extractContent(buffer: Buffer, tipo: MaterialTipo, mimeType: string): Promise<ExtractedContent> {
  const result = await extractByTipo(buffer, tipo, mimeType)

  return {
    fullText: result.text,
    chunks: chunkText(result.text),
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
