'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getUnsortedCards, getCollectionOptions } from '@/lib/collections-data'
import { suggestCollectionsForCards, type CollectionSuggestion } from '@/lib/generation/suggest'
import type { DestinationValue } from '@/components/upload/DestinationPicker'

export type SuggestCollectionsResult = { ok: true; suggestions: CollectionSuggestion[] } | { ok: false; error: string }

// Re-reads orphan cards + collections from the DB instead of trusting whatever the client
// currently has in state — avoids suggesting against a stale list, and it's still exactly one
// batch call regardless (CLAUDE.md item 9: "uma única chamada em lote").
export async function suggestCollectionsAction(): Promise<SuggestCollectionsResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const [cards, collections] = await Promise.all([getUnsortedCards(supabase, user.id), getCollectionOptions(supabase, user.id)])

  if (cards.length === 0 || collections.length === 0) {
    return { ok: true, suggestions: [] }
  }

  try {
    const suggestions = await suggestCollectionsForCards(cards, collections)
    return { ok: true, suggestions }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível obter sugestões da IA agora.' }
  }
}

// Shared by moveOrphanCardAction's "existing" branch and applySuggestedMovesAction (bulk-apply
// only ever targets an existing suggested collection, never "new"/"none") — verifies ownership of
// both rows before linking, same as the single-card path.
async function linkCardToExistingCollection(
  supabase: SupabaseClient,
  userId: string,
  flashcardId: string,
  collectionId: string
): Promise<{ ok: true; collectionName: string } | { ok: false; error: string }> {
  const { data: card, error: cardError } = await supabase.from('flashcards').select('id').eq('id', flashcardId).eq('user_id', userId).maybeSingle()

  if (cardError || !card) {
    return { ok: false, error: 'Card não encontrado.' }
  }

  const { data: col, error: colError } = await supabase
    .from('collections')
    .select('id, nome')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (colError || !col) {
    return { ok: false, error: 'Não foi possível encontrar a coleção selecionada.' }
  }

  const { error: linkError } = await supabase.from('collection_flashcards').insert({ collection_id: col.id, flashcard_id: flashcardId })

  if (linkError) {
    return { ok: false, error: `Não foi possível vincular o card à coleção "${col.nome}".` }
  }

  return { ok: true, collectionName: col.nome }
}

export type MoveOrphanCardResult = { ok: true; collectionId: string | null; collectionName: string | null } | { ok: false; error: string }

export async function moveOrphanCardAction(flashcardId: string, destination: DestinationValue): Promise<MoveOrphanCardResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  if (destination.type === 'none') {
    const { data: card, error: cardError } = await supabase.from('flashcards').select('id').eq('id', flashcardId).eq('user_id', user.id).maybeSingle()
    if (cardError || !card) {
      return { ok: false, error: 'Card não encontrado.' }
    }
    return { ok: true, collectionId: null, collectionName: null }
  }

  if (destination.type === 'existing') {
    const result = await linkCardToExistingCollection(supabase, user.id, flashcardId, destination.collectionId)
    if (!result.ok) return result
    return { ok: true, collectionId: destination.collectionId, collectionName: result.collectionName }
  }

  const { data: card, error: cardError } = await supabase.from('flashcards').select('id').eq('id', flashcardId).eq('user_id', user.id).maybeSingle()
  if (cardError || !card) {
    return { ok: false, error: 'Card não encontrado.' }
  }

  const name = destination.name.trim()
  if (!name) {
    return { ok: false, error: 'Informe um nome para a nova coleção.' }
  }

  const { data: newCol, error: insertError } = await supabase.from('collections').insert({ user_id: user.id, nome: name }).select('id, nome').single()

  if (insertError || !newCol) {
    return { ok: false, error: 'Não foi possível criar a coleção.' }
  }

  const { error: linkError } = await supabase.from('collection_flashcards').insert({ collection_id: newCol.id, flashcard_id: flashcardId })

  if (linkError) {
    return { ok: false, error: `Não foi possível vincular o card à coleção "${newCol.nome}".` }
  }

  return { ok: true, collectionId: newCol.id, collectionName: newCol.nome }
}

export type ApplySuggestedMovesResult = {
  ok: true
  moved: { flashcardId: string; collectionName: string }[]
  failed: { flashcardId: string; error: string }[]
}

// Bulk-applies the AI suggestions already fetched by suggestCollectionsAction — the client sends
// back exactly the {flashcardId, collectionId} pairs it currently shows a suggestion chip for.
// Each move is independent: a failure on one card (e.g. the collection was deleted moments ago)
// never undoes or hides the ones that already succeeded — see CLAUDE.md item 9, "Aplicar todas as
// sugestões".
export async function applySuggestedMovesAction(moves: { flashcardId: string; collectionId: string }[]): Promise<ApplySuggestedMovesResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const moved: { flashcardId: string; collectionName: string }[] = []
  const failed: { flashcardId: string; error: string }[] = []

  for (const { flashcardId, collectionId } of moves) {
    const result = await linkCardToExistingCollection(supabase, user.id, flashcardId, collectionId)
    if (result.ok) {
      moved.push({ flashcardId, collectionName: result.collectionName })
    } else {
      failed.push({ flashcardId, error: result.error })
    }
  }

  return { ok: true, moved, failed }
}

export type RemoveOrphanCardResult = { ok: true } | { ok: false; error: string }

// Safe to just delete: flashcard_responses, flashcard_schedule and collection_flashcards all FK
// flashcard_id with ON DELETE CASCADE (migrations 005, 010, 004) — nothing is left orphaned.
export async function removeOrphanCardAction(flashcardId: string): Promise<RemoveOrphanCardResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { error } = await supabase.from('flashcards').delete().eq('id', flashcardId).eq('user_id', user.id)

  if (error) {
    return { ok: false, error: 'Não foi possível remover o card.' }
  }

  return { ok: true }
}
