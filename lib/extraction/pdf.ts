import { PDFParse } from 'pdf-parse'
import { getData } from 'pdf-parse/worker'
import { PDFDocument } from 'pdf-lib'
import { extractTextFromPdfVision } from './claude-vision'
import type { ExtractionMethod } from './types'

// pdfjs-dist (used internally by pdf-parse) normally spins up a "fake worker" by resolving
// pdf.worker.mjs relative to its own file on disk — that path breaks once this module is bundled
// into .next/server chunks, since the bundled layout no longer matches node_modules. getData()
// returns the worker script embedded as a self-contained string instead, so there's no file path
// to resolve at all. Must run before any PDFParse instance is created; safe to call at module
// load since it just sets a static config value. See also next.config.ts's
// `serverExternalPackages` for the companion fix.
PDFParse.setWorker(getData())

// Below this *average* chars/page, the "text layer" is treated as noise and we fall back to
// vision instead of trusting it. Must be checked per-page, not against the document total: an
// 83-page fully-scanned PDF still produces ~1300 chars of page-marker boilerplate that pdf-parse
// invents, which reads as "non-empty" under a naive total-length check but averages ~16
// chars/page — see CLAUDE.md "Detecção de fallback texto→visão".
const MIN_AVG_CHARS_PER_PAGE = 100

// Anthropic's document (PDF) content block caps at 100 pages / 32 MB per request — see CLAUDE.md
// "Limite da API do Claude para PDF". A material this large is rejected up front rather than fed
// into the batching below; splitting an *oversized* material across multiple document uploads
// (not just multiple vision calls on one already-fetched PDF) is a bigger change deliberately not
// implemented yet (only when a real material needs it).
const MAX_VISION_PAGES = 100
const MAX_VISION_BYTES = 32 * 1024 * 1024

// Pages per vision call — keeps any single Anthropic call in a predictable ~40-90s window instead
// of scaling with the whole document (a dense 100-page PDF in one call risked 200-300s+, real
// risk of tripping the platform's function-duration limit even on generous plans). See CLAUDE.md
// "Processamento de PDF de imagem em lotes de páginas". This loop already tolerates any page
// count — MAX_VISION_PAGES above is the only thing capping it at 100 today, so lifting that guard
// later (once a real material needs it) is the whole job for supporting bigger PDFs, not a
// rewrite of the batching itself.
const VISION_BATCH_SIZE = 25

async function splitPdfIntoBatches(buffer: Buffer, batchSize: number): Promise<Buffer[]> {
  const sourceDoc = await PDFDocument.load(buffer)
  const totalPages = sourceDoc.getPageCount()
  const batches: Buffer[] = []

  for (let start = 0; start < totalPages; start += batchSize) {
    const pageIndices = Array.from({ length: Math.min(batchSize, totalPages - start) }, (_, i) => start + i)

    const batchDoc = await PDFDocument.create()
    const copiedPages = await batchDoc.copyPages(sourceDoc, pageIndices)
    copiedPages.forEach((page) => batchDoc.addPage(page))

    batches.push(Buffer.from(await batchDoc.save()))
  }

  return batches
}

// A batch failing (API error, malformed sub-PDF, etc.) fails the whole material rather than
// keeping the batches that already succeeded: a partially-transcribed material would look
// complete to Stage 2's flashcard generation later, with nothing signaling that pages are
// missing. Failing loud — with the exact page range and batch that broke — is simpler to reason
// about and lets the user just retry the upload; the alternative (persisting partial content,
// tracking which ranges are missing, surfacing that in the UI) is real complexity this stage
// doesn't need yet.
async function extractPdfViaVisionBatches(buffer: Buffer, pageCount: number): Promise<string> {
  const batches = await splitPdfIntoBatches(buffer, VISION_BATCH_SIZE)
  const results: string[] = []

  for (let i = 0; i < batches.length; i++) {
    const firstPage = i * VISION_BATCH_SIZE + 1
    const lastPage = Math.min(firstPage + VISION_BATCH_SIZE - 1, pageCount)
    try {
      const text = await extractTextFromPdfVision(batches[i].toString('base64'), firstPage)
      results.push(text.trim())
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Falha ao extrair via visão o lote de páginas ${firstPage}-${lastPage} de ${pageCount} ` +
          `(lote ${i + 1}/${batches.length}): ${reason}`
      )
    }
  }

  return results.join('\n\n')
}

export async function extractPdf(buffer: Buffer): Promise<{ text: string; method: ExtractionMethod }> {
  const parser = new PDFParse({ data: buffer })
  let nativeText = ''
  let pageCount = 0
  try {
    const result = await parser.getText()
    nativeText = result.text.trim()
    pageCount = result.total
  } finally {
    await parser.destroy()
  }

  const avgCharsPerPage = pageCount > 0 ? nativeText.length / pageCount : nativeText.length

  if (avgCharsPerPage >= MIN_AVG_CHARS_PER_PAGE) {
    return { text: nativeText, method: 'text' }
  }

  if (pageCount > MAX_VISION_PAGES || buffer.length > MAX_VISION_BYTES) {
    throw new Error(
      `Material excede o limite de páginas/tamanho para extração via visão (${pageCount} páginas, ` +
        `${(buffer.length / 1024 / 1024).toFixed(1)} MB — limite da API é 100 páginas / 32 MB por requisição).`
    )
  }

  const visionText = await extractPdfViaVisionBatches(buffer, pageCount)
  return { text: visionText.trim(), method: 'vision' }
}
