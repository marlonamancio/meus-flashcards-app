import type { SupabaseClient } from '@supabase/supabase-js'
import { assertNoError, initials, type CollectionSummary } from '@/lib/home-data'
import { COLLECTION_PALETTE, paletteForCollectionId } from '@/lib/palette'

export type GlobalWeakCard = {
  id: string
  frente: string
  errorPct: number
  errorCount: number
  collectionName: string
  collectionColor: string
}

export type ProgressoData = {
  collections: CollectionSummary[]
  weakCards: GlobalWeakCard[]
}

// /progresso renders "Evolução por coleção" (per-collection accuracy) and "Onde você mais erra"
// (cross-collection weak cards) side by side — these used to be two independent functions
// (getCollections + getGlobalWeakCards) that each re-fetched the user's ENTIRE
// flashcard_responses history and the full collections list on their own, downloading the same
// rows twice in a single page render. This fetches the shared raw data (collections, links,
// responses) exactly once and derives both views from it in memory; `flashcards` (for frente
// text) is the only table only the weak-cards view actually needs.
export async function getProgressoData(supabase: SupabaseClient, userId: string, weakCardsLimit = 5): Promise<ProgressoData> {
  const [
    { data: collectionRows, error: collectionsError },
    { data: responses, error: responsesError },
  ] = await Promise.all([
    supabase.from('collections').select('id, nome, criado_em, parent_id').eq('user_id', userId).order('criado_em', { ascending: false }),
    supabase.from('flashcard_responses').select('flashcard_id, acertou').eq('user_id', userId),
  ])

  assertNoError(collectionsError, 'collections')
  assertNoError(responsesError, 'flashcard_responses')

  const accuracyByFlashcard = new Map<string, { correct: number; total: number }>()
  for (const r of responses ?? []) {
    const entry = accuracyByFlashcard.get(r.flashcard_id) ?? { correct: 0, total: 0 }
    entry.total += 1
    if (r.acertou) entry.correct += 1
    accuracyByFlashcard.set(r.flashcard_id, entry)
  }

  if (!collectionRows || collectionRows.length === 0) {
    return { collections: [], weakCards: [] }
  }

  const collectionIds = collectionRows.map((c) => c.id as string)

  const [{ data: links, error: linksError }, { data: flashcards, error: flashcardsError }] = await Promise.all([
    supabase.from('collection_flashcards').select('collection_id, flashcard_id').in('collection_id', collectionIds),
    supabase.from('flashcards').select('id, frente').eq('user_id', userId),
  ])

  assertNoError(linksError, 'collection_flashcards')
  assertNoError(flashcardsError, 'flashcards')

  const cardsByCollection = new Map<string, string[]>()
  const collectionIdByCard = new Map<string, string>()
  for (const l of links ?? []) {
    const list = cardsByCollection.get(l.collection_id) ?? []
    list.push(l.flashcard_id)
    cardsByCollection.set(l.collection_id, list)
    if (!collectionIdByCard.has(l.flashcard_id)) collectionIdByCard.set(l.flashcard_id, l.collection_id)
  }

  const collections: CollectionSummary[] = collectionRows.map((c) => {
    const cardIds = cardsByCollection.get(c.id) ?? []
    let correct = 0
    let total = 0
    for (const id of cardIds) {
      const entry = accuracyByFlashcard.get(id)
      if (entry) {
        correct += entry.correct
        total += entry.total
      }
    }
    const palette = paletteForCollectionId(c.id)
    return {
      id: c.id,
      nome: c.nome,
      short: initials(c.nome),
      color: palette.color,
      soft: palette.soft,
      cardCount: cardIds.length,
      accuracyPct: total > 0 ? Math.round((correct / total) * 100) : null,
      parentId: (c.parent_id as string | null) ?? null,
    }
  })

  const collectionNameById = new Map(collectionRows.map((c) => [c.id as string, c.nome as string]))

  // Cross-collection "onde você mais erra": every response counts independently (no
  // de-duplication per flashcard), matching the same accuracy formula used everywhere else in
  // the app. A card can belong to more than one collection via collection_flashcards — we just
  // pick the first linked one for the colored-dot/name display, since this is a display nicety,
  // not a data-integrity concern.
  const weak: GlobalWeakCard[] = []
  for (const f of flashcards ?? []) {
    const stat = accuracyByFlashcard.get(f.id)
    if (!stat || stat.total === 0) continue

    const errorCount = stat.total - stat.correct
    if (errorCount === 0) continue

    const collectionId = collectionIdByCard.get(f.id)
    const collectionColor = collectionId ? paletteForCollectionId(collectionId).color : COLLECTION_PALETTE[0].color

    weak.push({
      id: f.id,
      frente: f.frente,
      errorPct: Math.round((errorCount / stat.total) * 100),
      errorCount,
      collectionName: (collectionId && collectionNameById.get(collectionId)) || 'Sem coleção',
      collectionColor,
    })
  }

  weak.sort((a, b) => b.errorPct - a.errorPct || b.errorCount - a.errorCount)

  return { collections, weakCards: weak.slice(0, weakCardsLimit) }
}
