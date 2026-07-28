// Splits extracted text into chunks small enough to feed one at a time to the Stage 2
// generation call (see CLAUDE.md "Limitação aceita para v1" — chunking pode gerar cards
// levemente repetidos entre pedaços, aceito por enquanto). Splits on paragraph boundaries so a
// chunk never cuts mid-sentence; only hard-splits (on whitespace) when a single paragraph alone
// exceeds maxChars.
const CHUNK_MAX_CHARS = 8000

export function chunkText(text: string, maxChars: number = CHUNK_MAX_CHARS): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const paragraphs = trimmed.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''

  for (const raw of paragraphs) {
    const paragraph = raw.trim()
    if (!paragraph) continue

    if (paragraph.length > maxChars) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      chunks.push(...splitLongParagraph(paragraph, maxChars))
      continue
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > maxChars) {
      chunks.push(current)
      current = paragraph
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)
  return chunks
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  const words = paragraph.split(/\s+/)
  const pieces: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars) {
      if (current) pieces.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) pieces.push(current)
  return pieces
}
