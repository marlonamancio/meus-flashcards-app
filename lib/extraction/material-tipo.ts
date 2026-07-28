import type { MaterialTipo } from './types'

// Kept dependency-free on purpose: this file is imported from client code (to validate a file
// before upload) as well as from the server action. It must never import from ./image,
// ./claude-vision, ./pdf, ./docx or ./pptx — those pull in @anthropic-ai/sdk, pdf-parse, mammoth
// and jszip, which are Node-only and would bloat/break the client bundle.
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Browsers/OS don't always report a precise MIME type for Office files, so extension is checked
// as a fallback alongside it, never instead of it (an attacker-controlled filename alone can't
// force a mismatched extractor onto file content whose MIME the browser already flagged).
export function materialTipoFromFile(mimeType: string, fileName: string): MaterialTipo | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''

  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (IMAGE_MIME_TYPES.has(mimeType) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image'
  if (mimeType === DOCX_MIME || ext === 'docx') return 'docx'
  if (mimeType === PPTX_MIME || ext === 'pptx') return 'pptx'
  return null
}
