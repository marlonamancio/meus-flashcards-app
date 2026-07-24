import type { SupabaseClient } from '@supabase/supabase-js'
import { COLLECTION_PALETTE, assertNoError } from '@/lib/home-data'

export type GlobalWeakCard = {
  id: string
  frente: string
  errorPct: number
  errorCount: number
  collectionName: string
  collectionColor: string
}

// Cross-collection "onde você mais erra": every response counts independently (no
// de-duplication per flashcard), matching the same accuracy formula used everywhere else in
// the app (getCollectionDetail, getCollections). A card can belong to more than one collection
// via collection_flashcards — we just pick the first linked one for the colored-dot/name
// display, since this is a display nicety, not a data-integrity concern.
export async function getGlobalWeakCards(supabase: SupabaseClient, userId: string, limit = 5): Promise<GlobalWeakCard[]> {
  const [
    { data: responses, error: responsesError },
    { data: flashcards, error: flashcardsError },
    { data: links, error: linksError },
    { data: collections, error: collectionsError },
  ] = await Promise.all([
    supabase.from('flashcard_responses').select('flashcard_id, acertou').eq('user_id', userId),
    supabase.from('flashcards').select('id, frente').eq('user_id', userId),
    supabase.from('collection_flashcards').select('collection_id, flashcard_id'),
    supabase.from('collections').select('id, nome').eq('user_id', userId).order('criado_em', { ascending: false }),
  ])

  assertNoError(responsesError, 'flashcard_responses')
  assertNoError(flashcardsError, 'flashcards')
  assertNoError(linksError, 'collection_flashcards')
  assertNoError(collectionsError, 'collections')

  const statsByCard = new Map<string, { correct: number; total: number }>()
  for (const r of responses ?? []) {
    const entry = statsByCard.get(r.flashcard_id) ?? { correct: 0, total: 0 }
    entry.total += 1
    if (r.acertou) entry.correct += 1
    statsByCard.set(r.flashcard_id, entry)
  }

  const collectionIdByCard = new Map<string, string>()
  for (const l of links ?? []) {
    if (!collectionIdByCard.has(l.flashcard_id)) collectionIdByCard.set(l.flashcard_id, l.collection_id)
  }

  const collectionIndexById = new Map((collections ?? []).map((c, i) => [c.id, i]))
  const collectionNameById = new Map((collections ?? []).map((c) => [c.id, c.nome]))

  const weak: GlobalWeakCard[] = []
  for (const f of flashcards ?? []) {
    const stat = statsByCard.get(f.id)
    if (!stat || stat.total === 0) continue

    const errorCount = stat.total - stat.correct
    if (errorCount === 0) continue

    const collectionId = collectionIdByCard.get(f.id)
    const paletteIndex = collectionId ? collectionIndexById.get(collectionId) : undefined
    const palette = COLLECTION_PALETTE[(paletteIndex ?? 0) % COLLECTION_PALETTE.length]

    weak.push({
      id: f.id,
      frente: f.frente,
      errorPct: Math.round((errorCount / stat.total) * 100),
      errorCount,
      collectionName: (collectionId && collectionNameById.get(collectionId)) || 'Sem coleção',
      collectionColor: palette.color,
    })
  }

  weak.sort((a, b) => b.errorPct - a.errorPct || b.errorCount - a.errorCount)

  return weak.slice(0, limit)
}
