import type { SupabaseClient } from '@supabase/supabase-js'
import { assertNoError, initials } from '@/lib/home-data'
import { paletteForCollectionId } from '@/lib/palette'

// Global search (CLAUDE.md item 12) — ILIKE across collections.nome and flashcards.frente/verso,
// scoped by user_id. Same cursor shape/tiebreak (criado_em, id) already used for the collection's
// card list pagination (lib/collections-data.ts), so "carregar mais" behaves identically here.
export type SearchCursor = {
  criadoEm: string
  id: string
}

export const SEARCH_PAGE_SIZE = 20

// Escapes ILIKE wildcard metacharacters so a literal "%" or "_" typed by the user is matched
// literally instead of acting as a SQL LIKE wildcard — a correctness fix, not a security
// boundary (every query here is already scoped to the caller's own user_id).
function escapeIlikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export type SearchCollectionResult = {
  id: string
  nome: string
  short: string
  color: string
  soft: string
  // Non-null only when this collection is a filha (CLAUDE.md item 4, um nível só) — used to
  // render the "Matéria > Aula" breadcrumb.
  parentNome: string | null
}

export type SearchCollectionsPage = {
  results: SearchCollectionResult[]
  nextCursor: SearchCursor | null
}

export async function searchCollections(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  cursor: SearchCursor | null,
  limit: number = SEARCH_PAGE_SIZE
): Promise<SearchCollectionsPage> {
  const pattern = `%${escapeIlikePattern(query)}%`

  let q = supabase.from('collections').select('id, nome, parent_id, criado_em').eq('user_id', userId).ilike('nome', pattern)

  if (cursor) {
    q = q.or(`criado_em.gt.${cursor.criadoEm},and(criado_em.eq.${cursor.criadoEm},id.gt.${cursor.id})`)
  }

  const { data, error } = await q.order('criado_em', { ascending: true }).order('id', { ascending: true }).limit(limit + 1)
  assertNoError(error, 'collections')

  const rows = data ?? []
  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows

  const parentIds = Array.from(new Set(pageRows.map((r) => r.parent_id as string | null).filter((id): id is string => id !== null)))
  const parentNomeById = new Map<string, string>()
  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase.from('collections').select('id, nome').in('id', parentIds).eq('user_id', userId)
    assertNoError(parentsError, 'collections')
    for (const p of parents ?? []) parentNomeById.set(p.id as string, p.nome as string)
  }

  const results: SearchCollectionResult[] = pageRows.map((r) => {
    const palette = paletteForCollectionId(r.id as string)
    const parentId = r.parent_id as string | null
    return {
      id: r.id as string,
      nome: r.nome as string,
      short: initials(r.nome as string),
      color: palette.color,
      soft: palette.soft,
      parentNome: parentId ? (parentNomeById.get(parentId) ?? null) : null,
    }
  })

  const last = pageRows[pageRows.length - 1] as { criado_em: string; id: string } | undefined
  const nextCursor = hasMore && last ? { criadoEm: last.criado_em, id: last.id } : null

  return { results, nextCursor }
}

export type SearchCardResult = {
  id: string
  frente: string
  verso: string
  collectionId: string
  collectionNome: string
  parentNome: string | null
}

export type SearchCardsPage = {
  results: SearchCardResult[]
  nextCursor: SearchCursor | null
}

// scopeCollectionId narrows the search to one collection (CLAUDE.md item 12, "Busca também na
// tela de detalhe da coleção") — the collection detail list is paginated on purpose and never
// holds every card in memory, so a client-side filter there would miss cards not yet loaded.
// Reuses this exact function instead of duplicating search logic; null keeps the unscoped, global
// behavior.
export async function searchCards(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  cursor: SearchCursor | null,
  scopeCollectionId: string | null = null,
  limit: number = SEARCH_PAGE_SIZE
): Promise<SearchCardsPage> {
  const pattern = `%${escapeIlikePattern(query)}%`

  let scopedIds: string[] | null = null
  if (scopeCollectionId) {
    const { data: links, error: linksError } = await supabase
      .from('collection_flashcards')
      .select('flashcard_id')
      .eq('collection_id', scopeCollectionId)
    assertNoError(linksError, 'collection_flashcards')

    scopedIds = (links ?? []).map((l) => l.flashcard_id as string)
    if (scopedIds.length === 0) return { results: [], nextCursor: null }
  }

  // Two separate .or() calls (not one combined) — postgrest-js appends each as its own `or=`
  // query param, and repeated params with the same key are ANDed by PostgREST. So this reads as
  // (frente ILIKE pattern OR verso ILIKE pattern) AND (cursor tuple condition), exactly like
  // fetchFlashcardRowsPage's single .or() plus an extra text-match condition ANDed on top.
  let q = supabase.from('flashcards').select('id, frente, verso, criado_em').eq('user_id', userId).or(`frente.ilike.${pattern},verso.ilike.${pattern}`)

  if (scopedIds) {
    q = q.in('id', scopedIds)
  }

  if (cursor) {
    q = q.or(`criado_em.gt.${cursor.criadoEm},and(criado_em.eq.${cursor.criadoEm},id.gt.${cursor.id})`)
  }

  const { data, error } = await q.order('criado_em', { ascending: true }).order('id', { ascending: true }).limit(limit + 1)
  assertNoError(error, 'flashcards')

  const rows = (data ?? []) as { id: string; frente: string; verso: string; criado_em: string }[]
  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows

  if (pageRows.length === 0) {
    return { results: [], nextCursor: null }
  }

  const last = pageRows[pageRows.length - 1]
  const nextCursor = hasMore && last ? { criadoEm: last.criado_em, id: last.id } : null

  // Scoped search already knows exactly which collection every result belongs to — no need for
  // the "pick any collection this card is linked to" resolution the unscoped path below does.
  // Just look up this one collection's nome/parentNome once instead of per-row.
  if (scopeCollectionId) {
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('nome, parent_id')
      .eq('id', scopeCollectionId)
      .eq('user_id', userId)
      .maybeSingle()
    assertNoError(collectionError, 'collections')
    if (!collection) return { results: [], nextCursor: null }

    const parentId = collection.parent_id as string | null
    let parentNome: string | null = null
    if (parentId) {
      const { data: parent, error: parentError } = await supabase.from('collections').select('nome').eq('id', parentId).eq('user_id', userId).maybeSingle()
      assertNoError(parentError, 'collections')
      parentNome = (parent?.nome as string | undefined) ?? null
    }

    const results: SearchCardResult[] = pageRows.map((row) => ({
      id: row.id,
      frente: row.frente,
      verso: row.verso,
      collectionId: scopeCollectionId,
      collectionNome: collection.nome as string,
      parentNome,
    }))

    return { results, nextCursor }
  }

  const pageIds = pageRows.map((r) => r.id)

  // A card can belong to more than one collection (many-to-many) — for the search result's
  // breadcrumb we just need ONE collection it belongs to, not every collection. Orphan cards
  // ("não organizados", no row here at all) are excluded from results below: there's no sensible
  // place for a search hit to link to for them (browse mode requires a collection context), and
  // they already have their own dedicated screen (/colecoes/nao-organizados).
  const { data: links, error: linksError } = await supabase.from('collection_flashcards').select('collection_id, flashcard_id').in('flashcard_id', pageIds)
  assertNoError(linksError, 'collection_flashcards')

  const collectionIdByFlashcard = new Map<string, string>()
  for (const l of links ?? []) {
    if (!collectionIdByFlashcard.has(l.flashcard_id as string)) {
      collectionIdByFlashcard.set(l.flashcard_id as string, l.collection_id as string)
    }
  }

  const collectionIds = Array.from(new Set(collectionIdByFlashcard.values()))
  const collectionById = new Map<string, { nome: string; parentId: string | null }>()
  if (collectionIds.length > 0) {
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, nome, parent_id')
      .in('id', collectionIds)
      .eq('user_id', userId)
    assertNoError(collectionsError, 'collections')
    for (const c of collections ?? []) {
      collectionById.set(c.id as string, { nome: c.nome as string, parentId: c.parent_id as string | null })
    }
  }

  const parentIds = Array.from(new Set(Array.from(collectionById.values()).map((c) => c.parentId).filter((id): id is string => id !== null)))
  const parentNomeById = new Map<string, string>()
  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase.from('collections').select('id, nome').in('id', parentIds).eq('user_id', userId)
    assertNoError(parentsError, 'collections')
    for (const p of parents ?? []) parentNomeById.set(p.id as string, p.nome as string)
  }

  const results: SearchCardResult[] = []
  for (const row of pageRows) {
    const collectionId = collectionIdByFlashcard.get(row.id)
    if (!collectionId) continue
    const collection = collectionById.get(collectionId)
    if (!collection) continue

    results.push({
      id: row.id,
      frente: row.frente,
      verso: row.verso,
      collectionId,
      collectionNome: collection.nome,
      parentNome: collection.parentId ? (parentNomeById.get(collection.parentId) ?? null) : null,
    })
  }

  return { results, nextCursor }
}
