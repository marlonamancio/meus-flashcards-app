import Anthropic from '@anthropic-ai/sdk'

// Stage 1 only transcribes — no tool use here, that's reserved for the Stage 2 generation call
// (see CLAUDE.md "Formato do prompt de geração"). Sonnet over Haiku on purpose: concurso público
// material leans on exact article numbers/dates/names, where extra vision accuracy pays for itself.
const EXTRACTION_MODEL = 'claude-sonnet-5'

const IMAGE_EXTRACTION_PROMPT =
  'Transcreva integralmente todo o texto visível neste documento, na ordem em que aparece. ' +
  'Preserve com exatidão números de artigo de lei, datas, nomes próprios e a estrutura de listas. ' +
  'Não resuma, não comente e não adicione informação que não esteja no documento — responda apenas com o texto transcrito.'

// PDF batches (see extractPdf in pdf.ts) are concatenated back into one document after
// extraction, so each page needs a stable, machine-parseable marker — "# PÁGINA N" — for that
// join to read coherently. firstPageNumber lets each batch continue the global page count
// instead of restarting at 1, since a batch is its own standalone sub-PDF as far as Claude is
// concerned.
const PDF_EXTRACTION_PROMPT =
  'Transcreva integralmente todo o texto visível neste documento, na ordem em que aparece. ' +
  'Preserve com exatidão números de artigo de lei, datas, nomes próprios e a estrutura de listas. ' +
  'Antes do conteúdo de cada página, insira uma linha própria no formato exato "# PÁGINA N" (N = número da página, sem mais nada na linha). ' +
  'Não resuma, não comente e não adicione informação que não esteja no documento — responda apenas com o texto transcrito.'

let client: Anthropic | undefined

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

export async function extractTextFromImage(base64: string, mediaType: ImageMediaType): Promise<string> {
  const message = await getClient().messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: IMAGE_EXTRACTION_PROMPT },
        ],
      },
    ],
  })

  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

// firstPageNumber lets a batch continue the document's real page numbering (batch 2 of a
// 25-page-per-batch split starts at 26, not 1) — see extractPdf in pdf.ts for how batches are
// produced and concatenated.
export async function extractTextFromPdfVision(base64: string, firstPageNumber = 1): Promise<string> {
  const pageOffsetNote =
    firstPageNumber > 1
      ? ` Este trecho corresponde a um recorte do documento original começando na página ${firstPageNumber} — numere as páginas de acordo, começando em ${firstPageNumber}.`
      : ''

  const message = await getClient().messages.create({
    model: EXTRACTION_MODEL,
    // Generous relative to a single scanned page: a 25-page batch of dense text can plausibly
    // produce several thousand tokens of transcription (see CLAUDE.md "Processamento de PDF de
    // imagem em lotes de páginas").
    max_tokens: 16384,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: PDF_EXTRACTION_PROMPT + pageOffsetNote },
        ],
      },
    ],
  })

  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}
