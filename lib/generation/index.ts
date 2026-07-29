import { runWithConcurrencyLimit } from '@/lib/concurrency'
import { generateFlashcardsFromContent, selectBestCards } from './tool'
import type { GeneratedCard, Quantidade } from './types'

export type { GeneratedCard, Quantidade } from './types'
export { generateFlashcardsFromTheme } from './tool'

// Below this, the material's whole extracted text comfortably fits in a single generation call.
// Above it, split into chunks (already produced by Stage 1's chunking, see
// lib/extraction/chunk.ts) and generate per chunk in parallel — same bounded-concurrency pattern
// already validated for PDF vision batching (lib/extraction/pdf.ts), for the same reason: total
// wall time stays close to the slowest single call instead of the sum of all of them. Slightly
// repeated cards across chunks is an accepted limitation (CLAUDE.md "Limitação aceita para v1")
// — the review step before saving (Stage 3) is where that gets caught, not here.
const SINGLE_CALL_CHAR_THRESHOLD = 100_000
const MAX_CONCURRENT_GENERATION_CALLS = 3

export async function generateFlashcardsFromMaterial(chunks: string[], quantidade: Quantidade): Promise<GeneratedCard[]> {
  const fullText = chunks.join('\n\n')

  if (fullText.length <= SINGLE_CALL_CHAR_THRESHOLD) {
    const cards = await generateFlashcardsFromContent(fullText, quantidade)
    if (cards.length === 0) {
      throw new Error('Nenhum flashcard pôde ser gerado a partir deste material — verifique se o conteúdo extraído tem conceitos de estudo reais.')
    }
    return cards
  }

  // quantidade (manual or automatic) is a TOTAL for the whole material, not a per-chunk count —
  // each chunk call gets the original quantidade plus its chunkContext, and lib/generation/tool.ts
  // decides internally how much that chunk should generously target (see quantidadeInstruction).
  // Pre-dividing N across chunks here (e.g. Math.round(N / chunks.length)) doesn't work: with many
  // chunks it degenerates to "exactly 1 per chunk", which models don't reliably obey when a chunk
  // has more genuine content — real bug found with N=30 across 31 chunks, summing to 51. The fix
  // is generous per-chunk generation + a final cut to the exact N (see selectBestCards below), not
  // a smarter division.
  const outcomes = await runWithConcurrencyLimit(
    chunks.map((chunk, i) => () => generateFlashcardsFromContent(chunk, quantidade, { index: i, total: chunks.length })),
    MAX_CONCURRENT_GENERATION_CALLS
  )

  const failures: string[] = []
  const allCards: GeneratedCard[] = []

  outcomes.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      allCards.push(...outcome.value)
      return
    }
    const reason = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
    failures.push(`trecho ${i + 1}/${chunks.length}: ${reason}`)
  })

  if (failures.length > 0) {
    throw new Error(`Falha ao gerar flashcards de ${failures.length} de ${chunks.length} trecho(s) — ${failures.join('; ')}`)
  }

  // A single trecho returning zero cards is valid (ex: capa/sumário/índice — ver
  // callCriarFlashcards em lib/generation/tool.ts), but ALL trechos combined producing nothing
  // is a different, real problem worth surfacing instead of silently saving an empty
  // cards_gerados.
  if (allCards.length === 0) {
    throw new Error('Nenhum flashcard pôde ser gerado a partir deste material — verifique se o conteúdo extraído tem conceitos de estudo reais.')
  }

  // Manual quantidade: each chunk was told to generate generously (with margin above N/chunks),
  // so the pool usually overshoots the requested total — cut it down to exactly N here. If the
  // material genuinely doesn't sustain N distinct concepts, the pool can still come in under N;
  // selectBestCards is a no-op in that case (returns what it got) rather than fabricating more.
  if (quantidade.type === 'manual') {
    return selectBestCards(allCards, quantidade.count)
  }

  return allCards
}
