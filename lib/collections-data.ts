import type { SupabaseClient } from '@supabase/supabase-js'
import { assertNoError, initials, type CollectionSummary } from '@/lib/home-data'
import { paletteForCollectionId } from '@/lib/palette'

export type CollectionOption = {
  id: string
  nome: string
}

// Cheap {id, nome} listing for destination pickers (upload/CSV import) — avoids the
// accuracy/card-count aggregation getCollections() does, which isn't needed here. Deliberately
// unaware of hierarchy (sub-coleções) — destination pickers always create/target top-level
// collections; setting a mãe is a separate action (setCollectionParentAction).
export async function getCollectionOptions(supabase: SupabaseClient, userId: string): Promise<CollectionOption[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('id, nome')
    .eq('user_id', userId)
    .order('nome', { ascending: true })

  assertNoError(error, 'collections')
  return data ?? []
}

// Eligible targets for "Agrupar em..." (setCollectionParentAction) — only collections without a
// mãe of their own qualify, since sub-coleções support one level only (CLAUDE.md item 4). This is
// the same rule the server action re-validates before writing (never trust the client-side
// filtering alone), but filtering here means the picker UI never even offers an invalid choice.
export async function getEligibleParentOptions(supabase: SupabaseClient, userId: string, excludeId: string): Promise<CollectionOption[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('id, nome')
    .eq('user_id', userId)
    .is('parent_id', null)
    .neq('id', excludeId)
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

// Shared only by getCollectionOverview now (the /collection/[id] list screen, the one place that
// actually renders accuracy, review count and hierarchy) — Estudar/Navegar use the much lighter
// CollectionLite below instead (see CollectionDetail), since neither ever displays any of this
// (confirmed via full-text search of StudySession.tsx/BrowseSession.tsx before this split — see
// CLAUDE.md performance audit, "over-fetching em getCollectionMeta").
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
  // Sub-coleções (CLAUDE.md item 4), one level only. null = esta é uma coleção raiz (pode ou não
  // ter filhas). Preenchido = esta é uma filha; nesse caso `children` abaixo é sempre [] (uma
  // filha nunca tem filhas, regra de um nível só).
  parentId: string | null
  parentNome: string | null
  children: CollectionSummary[]
}

// Just the display fields Estudar/Navegar actually render (collection avatar + name) — no
// accuracy, review count, cardCount or hierarchy, since neither StudySession nor BrowseSession
// ever reads those.
type CollectionLite = {
  id: string
  nome: string
  short: string
  color: string
  soft: string
}

// No per-card accuracyPct either — that field exists on CollectionCard for the paginated list
// screen (CollectionCardsList), which is the only place it's rendered; computing it here would
// mean fetching every response ever given to every card in the collection, same cost this split
// exists to avoid.
type LiteCard = { id: string; frente: string; verso: string }

export type CollectionDetail = CollectionLite & { cards: LiteCard[] }

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

// Cheap, standalone fetch of just the collection's flashcard ids (no metadata, no card content,
// no accuracy) — lets a caller that only needs ids for something else (e.g. getDueMap) fetch them
// in parallel with the heavier getCollectionOverview/getCollectionDetail call instead of waiting
// for it to finish first. See CLAUDE.md "Performance — paralelização de getDueMap".
export async function getCollectionCardIds(supabase: SupabaseClient, userId: string, collectionId: string): Promise<string[]> {
  const { data, error } = await supabase.from('collection_flashcards').select('flashcard_id').eq('collection_id', collectionId)

  assertNoError(error, 'collection_flashcards')
  return (data ?? []).map((l) => l.flashcard_id as string)
}

// Child collections of a mãe, with the same per-collection card-count/accuracy shape used
// everywhere else (CollectionSummary) — reused by the /colecoes list to render each child row
// inside its mãe's expandable header. Sub-coleções are one level only (CLAUDE.md item 4), so a
// child collection never itself has children — this is only ever called for a (potential) mãe.
async function getChildCollections(supabase: SupabaseClient, userId: string, parentId: string): Promise<CollectionSummary[]> {
  const { data: children, error: childrenError } = await supabase
    .from('collections')
    .select('id, nome, criado_em')
    .eq('user_id', userId)
    .eq('parent_id', parentId)
    .order('criado_em', { ascending: true })

  assertNoError(childrenError, 'collections')
  if (!children || children.length === 0) return []

  const childIds = children.map((c) => c.id as string)

  const { data: links, error: linksError } = await supabase
    .from('collection_flashcards')
    .select('collection_id, flashcard_id')
    .in('collection_id', childIds)

  assertNoError(linksError, 'collection_flashcards')

  const cardsByChild = new Map<string, string[]>()
  for (const l of links ?? []) {
    const list = cardsByChild.get(l.collection_id) ?? []
    list.push(l.flashcard_id)
    cardsByChild.set(l.collection_id, list)
  }

  const allFlashcardIds = Array.from(new Set((links ?? []).map((l) => l.flashcard_id as string)))
  const { data: responses, error: responsesError } =
    allFlashcardIds.length > 0
      ? await supabase.from('flashcard_responses').select('flashcard_id, acertou').eq('user_id', userId).in('flashcard_id', allFlashcardIds)
      : { data: [] as { flashcard_id: string; acertou: boolean }[], error: null }

  assertNoError(responsesError, 'flashcard_responses')

  const accuracyByFlashcard = new Map<string, { correct: number; total: number }>()
  for (const r of responses ?? []) {
    const entry = accuracyByFlashcard.get(r.flashcard_id) ?? { correct: 0, total: 0 }
    entry.total += 1
    if (r.acertou) entry.correct += 1
    accuracyByFlashcard.set(r.flashcard_id, entry)
  }

  return children.map((c) => {
    const cardIds = cardsByChild.get(c.id) ?? []
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
      parentId,
    }
  })
}

// Collection metadata + collection-wide accuracy for getCollectionOverview (the /collection/[id]
// list screen — the only caller left since getCollectionDetail below stopped needing any of
// this). Palette is a deterministic hash of the collection's own id (lib/palette.ts), not a
// position in some ordering — same color everywhere the collection appears, without ever having
// to fetch the user's other collections just to compute an index.
async function getCollectionMeta(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string
): Promise<{ meta: CollectionMeta; accuracyByFlashcard: Map<string, { correct: number; total: number }> } | null> {
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, nome, parent_id')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .maybeSingle()

  assertNoError(collectionError, 'collections')
  if (!collection) return null

  const parentId = (collection.parent_id as string | null) ?? null

  // A child never has children of its own (one level only), so children is only ever fetched for
  // a (potential) mãe — skip the query entirely for a collection that already has a parent.
  const [parentLookup, children] = await Promise.all([
    parentId
      ? supabase.from('collections').select('nome').eq('id', parentId).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    parentId ? Promise.resolve([]) : getChildCollections(supabase, userId, collectionId),
  ])

  assertNoError(parentLookup.error, 'collections')
  const parentNome = (parentLookup.data?.nome as string | undefined) ?? null

  const palette = paletteForCollectionId(collection.id)

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
      parentId,
      parentNome,
      children,
    },
    accuracyByFlashcard,
  }
}

// FULL card list (no pagination), lightweight metadata only — Navegar needs every card's
// frente/verso, since browsing goes front-to-back across the whole collection, but never renders
// accuracy, review count or hierarchy (verified against BrowseSession.tsx — see CLAUDE.md
// performance audit, "over-fetching em getCollectionMeta"). Estudar stopped using this (see
// getCollectionStudyMeta/getFlashcardsByIds below) — a study session only ever touches the cards
// actually due today, so fetching the other however-many-hundred cards' content here would be
// exactly the over-fetching this split exists to avoid (CLAUDE.md "Decisão adicional — Estudar
// deve buscar só o conteúdo dos cards vencidos"). Deliberately independent of
// getCollectionMeta/getCollectionOverview below: no children/parent lookup, no accuracy
// computation (which would mean fetching every response ever given to every card in the
// collection), no extra query to place the collection in some ordering for its color. Only the
// /collection/[id] list SCREEN is paginated (getCollectionOverview below) — that's the one
// CLAUDE.md's "Performance — paginação" is actually about.
export async function getCollectionDetail(supabase: SupabaseClient, userId: string, collectionId: string): Promise<CollectionDetail | null> {
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, nome')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .maybeSingle()

  assertNoError(collectionError, 'collections')
  if (!collection) return null

  const palette = paletteForCollectionId(collection.id)
  const meta: CollectionLite = { id: collection.id, nome: collection.nome, short: initials(collection.nome), color: palette.color, soft: palette.soft }

  const { data: links, error: linksError } = await supabase.from('collection_flashcards').select('flashcard_id').eq('collection_id', collectionId)

  assertNoError(linksError, 'collection_flashcards')

  const flashcardIds = (links ?? []).map((l) => l.flashcard_id as string)
  if (flashcardIds.length === 0) {
    return { ...meta, cards: [] }
  }

  // No join with `materials` here — origem/material_id aren't needed to render the list, and a
  // flashcard imported via CSV always has material_id NULL, so an inner join on that table would
  // silently drop every CSV-origin card from the result.
  const { data: flashcards, error: flashcardsError } = await supabase
    .from('flashcards')
    .select('id, frente, verso')
    .in('id', flashcardIds)
    .eq('user_id', userId)
    .order('criado_em', { ascending: true })
    .order('id', { ascending: true })

  assertNoError(flashcardsError, 'flashcards')

  return { ...meta, cards: (flashcards ?? []) as LiteCard[] }
}

// Estudar-only: collection avatar/name with NO card content at all — the caller fetches content
// separately (getFlashcardsByIds below), scoped to only the ids actually due today instead of
// the whole collection like getCollectionDetail legitimately does for Navegar. See CLAUDE.md
// "Decisão adicional — Estudar deve buscar só o conteúdo dos cards vencidos".
export async function getCollectionStudyMeta(supabase: SupabaseClient, userId: string, collectionId: string): Promise<CollectionLite | null> {
  const { data: collection, error } = await supabase
    .from('collections')
    .select('id, nome')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .maybeSingle()

  assertNoError(error, 'collections')
  if (!collection) return null

  const palette = paletteForCollectionId(collection.id)
  return { id: collection.id, nome: collection.nome, short: initials(collection.nome), color: palette.color, soft: palette.soft }
}

// Content for an already-known, specific set of flashcard ids — Estudar's counterpart to the
// full-collection fetch inside getCollectionDetail. No ordering applied: callers that care about
// order (Estudar's due-priority queue) already have their own id ordering and only use this for
// an id -> {frente, verso} lookup.
export async function getFlashcardsByIds(supabase: SupabaseClient, userId: string, ids: string[]): Promise<LiteCard[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase.from('flashcards').select('id, frente, verso').in('id', ids).eq('user_id', userId)

  assertNoError(error, 'flashcards')
  return (data ?? []) as LiteCard[]
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
