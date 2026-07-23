import type { SupabaseClient } from '@supabase/supabase-js'
import { COLLECTION_PALETTE, assertNoError, initials } from '@/lib/home-data'

export type CollectionDetail = {
  id: string
  nome: string
  short: string
  color: string
  soft: string
  cardCount: number
  accuracyPct: number | null
  errorPct: number | null
  reviewCount: number
}

// Cards belong to a collection only via collection_flashcards; a card with no row there
// (for any of the user's collections) is what the UI calls "não organizados".
export async function getUnsortedCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const [{ data: flashcards, error: flashcardsError }, { data: collections, error: collectionsError }] =
    await Promise.all([
      supabase.from('flashcards').select('id').eq('user_id', userId),
      supabase.from('collections').select('id').eq('user_id', userId),
    ])

  assertNoError(flashcardsError, 'flashcards')
  assertNoError(collectionsError, 'collections')

  const flashcardIds = (flashcards ?? []).map((f) => f.id as string)
  if (flashcardIds.length === 0) return 0

  const collectionIds = (collections ?? []).map((c) => c.id as string)
  if (collectionIds.length === 0) return flashcardIds.length

  const { data: links, error: linksError } = await supabase
    .from('collection_flashcards')
    .select('flashcard_id')
    .in('collection_id', collectionIds)

  assertNoError(linksError, 'collection_flashcards')

  const linkedIds = new Set((links ?? []).map((l) => l.flashcard_id as string))
  return flashcardIds.filter((id) => !linkedIds.has(id)).length
}

// Palette/short-initials assignment mirrors getCollections() in home-data.ts (index in the
// same criado_em-desc ordering) so a collection's avatar color matches between the list and
// its detail page.
export async function getCollectionDetail(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string
): Promise<CollectionDetail | null> {
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

  let correct = 0
  let total = 0
  if (flashcardIds.length > 0) {
    const { data: responses, error: responsesError } = await supabase
      .from('flashcard_responses')
      .select('acertou')
      .eq('user_id', userId)
      .in('flashcard_id', flashcardIds)

    assertNoError(responsesError, 'flashcard_responses')

    total = responses?.length ?? 0
    correct = (responses ?? []).filter((r) => r.acertou).length
  }

  return {
    id: collection.id,
    nome: collection.nome,
    short: initials(collection.nome),
    color: palette.color,
    soft: palette.soft,
    cardCount: flashcardIds.length,
    accuracyPct: total > 0 ? Math.round((correct / total) * 100) : null,
    errorPct: total > 0 ? Math.round(((total - correct) / total) * 100) : null,
    reviewCount: total,
  }
}
