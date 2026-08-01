import type { SupabaseClient } from '@supabase/supabase-js'
import { COLLECTION_PALETTE, assertNoError, initials } from '@/lib/home-data'

export type CollectionOption = {
  id: string
  nome: string
}

// Cheap {id, nome} listing for destination pickers (upload/CSV import) — avoids the
// accuracy/card-count aggregation getCollections() does, which isn't needed here.
export async function getCollectionOptions(supabase: SupabaseClient, userId: string): Promise<CollectionOption[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('id, nome')
    .eq('user_id', userId)
    .order('nome', { ascending: true })

  assertNoError(error, 'collections')
  return data ?? []
}

export type CollectionCard = {
  id: string
  frente: string
  verso: string
  accuracyPct: number | null
}

// Cursor-based pagination for the collection's card list (CLAUDE.md "Performance — paginação da
// lista de cards da coleção") — the last (criado_em, id) seen, not an OFFSET. OFFSET degrades on
// large lists and can duplicate/skip rows if the underlying set changes between pages; a cursor
// on the same stable (criado_em, id) tiebreak already used everywhere else cards are ordered
// doesn't have either problem.
export type CardsCursor = {
  criadoEm: string
  id: string
}

export type CollectionCardsPage = {
  cards: CollectionCard[]
  nextCursor: CardsCursor | null
}

export const COLLECTION_CARDS_PAGE_SIZE = 40

// Shared by getCollectionDetail (full cards — study/browse need every card, not just a page) and
// getCollectionOverview (paginated — the /collection/[id] list screen). Collection-wide by
// definition, so never affected by the card list's pagination.
type CollectionMeta = {
  id: string
  nome: string
  short: string
  color: string
  soft: string
  cardCount: number
  accuracyPct: number | null
  errorPct: number | null
  reviewCount: number
  // Every flashcard id in the collection, independent of pagination — callers that need to reason
  // about the WHOLE collection (e.g. getDueMap for the "estudar" button) must use this, not
  // `cards.map(c => c.id)`, which on CollectionOverview is only the current page.
  cardIds: string[]
}

export type CollectionDetail = CollectionMeta & { cards: CollectionCard[] }

export type CollectionOverview = CollectionMeta & { cards: CollectionCard[]; nextCursor: CardsCursor | null }

// Cards belong to a collection only via collection_flashcards; a card with no row there
// (for any of the user's collections) is what the UI calls "não organizados". Shared by
// getUnsortedCount (Coleções list badge) and getUnsortedCards ("Não organizados" screen).
async function getUnsortedFlashcardIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: flashcards, error: flashcardsError }, { data: collections, error: collectionsError }] =
    await Promise.all([
      supabase.from('flashcards').select('id').eq('user_id', userId),
      supabase.from('collections').select('id').eq('user_id', userId),
    ])

  assertNoError(flashcardsError, 'flashcards')
  assertNoError(collectionsError, 'collections')

  const flashcardIds = (flashcards ?? []).map((f) => f.id as string)
  if (flashcardIds.length === 0) return []

  const collectionIds = (collections ?? []).map((c) => c.id as string)
  if (collectionIds.length === 0) return flashcardIds

  const { data: links, error: linksError } = await supabase
    .from('collection_flashcards')
    .select('flashcard_id')
    .in('collection_id', collectionIds)

  assertNoError(linksError, 'collection_flashcards')

  const linkedIds = new Set((links ?? []).map((l) => l.flashcard_id as string))
  return flashcardIds.filter((id) => !linkedIds.has(id))
}

export async function getUnsortedCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const ids = await getUnsortedFlashcardIds(supabase, userId)
  return ids.length
}

export type UnsortedCard = {
  id: string
  frente: string
  verso: string
}

export async function getUnsortedCards(supabase: SupabaseClient, userId: string): Promise<UnsortedCard[]> {
  const ids = await getUnsortedFlashcardIds(supabase, userId)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('flashcards')
    .select('id, frente, verso')
    .in('id', ids)
    .eq('user_id', userId)
    // `id` as tiebreaker: cards from the same AI-generation/CSV-import batch share the exact
    // same criado_em (a single bulk INSERT, one now() for the whole statement) — see the fix in
    // getCollectionDetail below for the full reasoning.
    .order('criado_em', { ascending: true })
    .order('id', { ascending: true })

  assertNoError(error, 'flashcards')
  return data ?? []
}

type FlashcardRow = { id: string; frente: string; verso: string; criado_em: string }

// One page of raw flashcard rows for a fixed set of ids, ordered by the same stable (criado_em,
// id) tiebreak used everywhere else — see the reasoning in getCollectionDetail's history. Fetches
// one extra row (limit + 1) purely to know whether there's a next page, without a separate count
// query.
async function fetchFlashcardRowsPage(
  supabase: SupabaseClient,
  userId: string,
  flashcardIds: string[],
  cursor: CardsCursor | null,
  limit: number
): Promise<FlashcardRow[]> {
  let query = supabase.from('flashcards').select('id, frente, verso, criado_em').in('id', flashcardIds).eq('user_id', userId)

  if (cursor) {
    // Tuple comparison (criado_em, id) > (cursor.criadoEm, cursor.id) — "strictly after the last
    // row of the previous page", expressed as the two cases PostgREST's `.or()` understands.
    query = query.or(`criado_em.gt.${cursor.criadoEm},and(criado_em.eq.${cursor.criadoEm},id.gt.${cursor.id})`)
  }

  const { data, error } = await query.order('criado_em', { ascending: true }).order('id', { ascending: true }).limit(limit + 1)

  assertNoError(error, 'flashcards')
  return (data ?? []) as FlashcardRow[]
}

function buildCardsPage(rows: FlashcardRow[], limit: number, accuracyByFlashcard: Map<string, { correct: number; total: number }>): CollectionCardsPage {
  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows

  const cards: CollectionCard[] = pageRows.map((f) => {
    const entry = accuracyByFlashcard.get(f.id)
    return { id: f.id, frente: f.frente, verso: f.verso, accuracyPct: entry && entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : null }
  })

  const last = pageRows[pageRows.length - 1]
  const nextCursor = hasMore && last ? { criadoEm: last.criado_em, id: last.id } : null

  return { cards, nextCursor }
}

// Standalone page fetch for "Carregar mais" (loadMoreCardsAction) — a fresh request separate from
// getCollectionOverview, so it computes accuracy only for the ids in this page (cheap), unlike
// getCollectionOverview's first page, which already has a collection-wide accuracy map on hand
// from computing the aggregate stats and reuses it instead of a second query.
export async function getCollectionCardsPage(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
  cursor: CardsCursor | null,
  limit: number = COLLECTION_CARDS_PAGE_SIZE
): Promise<CollectionCardsPage> {
  const { data: links, error: linksError } = await supabase.from('collection_flashcards').select('flashcard_id').eq('collection_id', collectionId)

  assertNoError(linksError, 'collection_flashcards')

  const flashcardIds = (links ?? []).map((l) => l.flashcard_id as string)
  if (flashcardIds.length === 0) return { cards: [], nextCursor: null }

  const rows = await fetchFlashcardRowsPage(supabase, userId, flashcardIds, cursor, limit)
  const pageIds = rows.slice(0, limit).map((r) => r.id)

  const { data: responses, error: responsesError } =
    pageIds.length > 0
      ? await supabase.from('flashcard_responses').select('flashcard_id, acertou').eq('user_id', userId).in('flashcard_id', pageIds)
      : { data: [] as { flashcard_id: string; acertou: boolean }[], error: null }

  assertNoError(responsesError, 'flashcard_responses')

  const accuracyByFlashcard = new Map<string, { correct: number; total: number }>()
  for (const r of responses ?? []) {
    const entry = accuracyByFlashcard.get(r.flashcard_id) ?? { correct: 0, total: 0 }
    entry.total += 1
    if (r.acertou) entry.correct += 1
    accuracyByFlashcard.set(r.flashcard_id, entry)
  }

  return buildCardsPage(rows, limit, accuracyByFlashcard)
}

// Collection metadata + collection-wide accuracy — shared by getCollectionDetail (full cards) and
// getCollectionOverview (paginated cards), so the lookup/palette/aggregate-stats logic isn't
// duplicated between them. Palette/short-initials assignment mirrors getCollections() in
// home-data.ts (index in the same criado_em-desc ordering) so a collection's avatar color matches
// between the list and its detail page.
async function getCollectionMeta(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string
): Promise<{ meta: CollectionMeta; accuracyByFlashcard: Map<string, { correct: number; total: number }> } | null> {
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, nome')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .maybeSingle()

  assertNoError(collectionError, 'collections')
  if (!collection) return null

  const { data: allCollections, error: allCollectionsError } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', userId)
    .order('criado_em', { ascending: false })

  assertNoError(allCollectionsError, 'collections')

  const index = Math.max(
    (allCollections ?? []).findIndex((c) => c.id === collectionId),
    0
  )
  const palette = COLLECTION_PALETTE[index % COLLECTION_PALETTE.length]

  const { data: links, error: linksError } = await supabase
    .from('collection_flashcards')
    .select('flashcard_id')
    .eq('collection_id', collectionId)

  assertNoError(linksError, 'collection_flashcards')

  const flashcardIds = (links ?? []).map((l) => l.flashcard_id as string)

  const accuracyByFlashcard = new Map<string, { correct: number; total: number }>()
  let correct = 0
  let total = 0

  if (flashcardIds.length > 0) {
    const { data: responses, error: responsesError } = await supabase
      .from('flashcard_responses')
      .select('flashcard_id, acertou')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds)

    assertNoError(responsesError, 'flashcard_responses')

    for (const r of responses ?? []) {
      const entry = accuracyByFlashcard.get(r.flashcard_id) ?? { correct: 0, total: 0 }
      entry.total += 1
      if (r.acertou) entry.correct += 1
      accuracyByFlashcard.set(r.flashcard_id, entry)
      total += 1
      if (r.acertou) correct += 1
    }
  }

  return {
    meta: {
      id: collection.id,
      nome: collection.nome,
      short: initials(collection.nome),
      color: palette.color,
      soft: palette.soft,
      cardCount: flashcardIds.length,
      accuracyPct: total > 0 ? Math.round((correct / total) * 100) : null,
      errorPct: total > 0 ? Math.round(((total - correct) / total) * 100) : null,
      reviewCount: total,
      cardIds: flashcardIds,
    },
    accuracyByFlashcard,
  }
}

// FULL card list (no pagination) — study mode and browse mode both need to operate over every
// card in the collection, not just a page of it (study needs every due card regardless of where
// it falls in the list; browse navigates the whole collection front-to-back). Only the
// /collection/[id] list SCREEN is paginated (getCollectionOverview below) — that's the one
// CLAUDE.md's "Performance — paginação" is actually about.
export async function getCollectionDetail(supabase: SupabaseClient, userId: string, collectionId: string): Promise<CollectionDetail | null> {
  const result = await getCollectionMeta(supabase, userId, collectionId)
  if (!result) return null
  const { meta, accuracyByFlashcard } = result

  if (meta.cardIds.length === 0) {
    return { ...meta, cards: [] }
  }

  // No join with `materials` here — origem/material_id aren't needed to render the list, and a
  // flashcard imported via CSV always has material_id NULL, so an inner join on that table would
  // silently drop every CSV-origin card from the result.
  const { data: flashcards, error: flashcardsError } = await supabase
    .from('flashcards')
    .select('id, frente, verso')
    .in('id', meta.cardIds)
    .eq('user_id', userId)
    .order('criado_em', { ascending: true })
    .order('id', { ascending: true })

  assertNoError(flashcardsError, 'flashcards')

  const cards: CollectionCard[] = (flashcards ?? []).map((f) => {
    const entry = accuracyByFlashcard.get(f.id)
    return { id: f.id, frente: f.frente, verso: f.verso, accuracyPct: entry && entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : null }
  })

  return { ...meta, cards }
}

// Paginated version of the above for the /collection/[id] list screen (CLAUDE.md "Performance —
// paginação da lista de cards da coleção") — same metadata/aggregate stats, but only the first
// COLLECTION_CARDS_PAGE_SIZE cards' frente/verso are fetched; getCollectionCardsPage fetches the
// rest on "Carregar mais".
export async function getCollectionOverview(supabase: SupabaseClient, userId: string, collectionId: string): Promise<CollectionOverview | null> {
  const result = await getCollectionMeta(supabase, userId, collectionId)
  if (!result) return null
  const { meta, accuracyByFlashcard } = result

  if (meta.cardIds.length === 0) {
    return { ...meta, cards: [], nextCursor: null }
  }

  const rows = await fetchFlashcardRowsPage(supabase, userId, meta.cardIds, null, COLLECTION_CARDS_PAGE_SIZE)
  const page = buildCardsPage(rows, COLLECTION_CARDS_PAGE_SIZE, accuracyByFlashcard)

  return { ...meta, cards: page.cards, nextCursor: page.nextCursor }
}
