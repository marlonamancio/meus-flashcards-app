'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import type { DestinationValue } from '@/components/upload/DestinationPicker'

export type UpdateFlashcardResult =
  | {
      ok: true
      // True when the card no longer belongs to the collection this browse session was opened
      // from (moved elsewhere, or removed to "não organizados") — the client uses this to decide
      // whether the card should drop out of the current browse queue.
      movedAway: boolean
    }
  | { ok: false; error: string }

// Browse-mode card editing (CLAUDE.md item 11, "Edição do card" / "Trocar a coleção do card").
// Touches ONLY flashcards.frente/verso and collection_flashcards — never flashcard_responses or
// flashcard_schedule, keeping the same SM-2 isolation the rest of browse mode already guarantees
// (see BrowseSession.tsx).
export async function updateFlashcardAction(
  flashcardId: string,
  frente: string,
  verso: string,
  currentCollectionId: string,
  destination: DestinationValue
): Promise<UpdateFlashcardResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const trimmedFrente = frente.trim()
  const trimmedVerso = verso.trim()

  if (!trimmedFrente || !trimmedVerso) {
    return { ok: false, error: 'Preencha a frente e o verso do card.' }
  }

  // Explicit ownership check before touching anything — an `.update()` whose filter matches zero
  // rows (e.g. flashcardId belongs to another user) still returns `error: null` from Supabase, so
  // relying on updateError alone here would silently let a foreign flashcardId fall through to
  // the collection_flashcards insert below instead of being rejected. See security audit finding
  // on this action (IDOR: card de outro usuário linkável à sua coleção).
  const { data: card, error: cardError } = await supabase
    .from('flashcards')
    .select('id')
    .eq('id', flashcardId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (cardError || !card) {
    return { ok: false, error: 'Card não encontrado.' }
  }

  // Same reasoning for currentCollectionId — RLS's DELETE policy already scopes the unlink step
  // below to collections the caller owns, but the app shouldn't rely on that alone (CLAUDE.md
  // "não confiar só na RLS").
  const { data: currentCollection, error: currentCollectionError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', currentCollectionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (currentCollectionError || !currentCollection) {
    return { ok: false, error: 'Coleção atual não encontrada.' }
  }

  const { error: updateError } = await supabase
    .from('flashcards')
    .update({ frente: trimmedFrente, verso: trimmedVerso })
    .eq('id', flashcardId)
    .eq('user_id', user.id)

  if (updateError) {
    return { ok: false, error: 'Não foi possível salvar as alterações.' }
  }

  // Picking the same collection the card is already in isn't a move — nothing else to do. This
  // is also what happens when the user never touches the collection picker at all, since it
  // starts pre-selected on the current collection.
  if (destination.type === 'existing' && destination.collectionId === currentCollectionId) {
    return { ok: true, movedAway: false }
  }

  // A card can belong to more than one collection (many-to-many) — this only ever touches the
  // link with `currentCollectionId` (the collection this /navegar/[cardId] session was opened
  // from), never any other collection the card might already be in.
  let targetCollectionId: string | null = null

  if (destination.type === 'existing') {
    const { data: col, error } = await supabase
      .from('collections')
      .select('id')
      .eq('id', destination.collectionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !col) {
      return { ok: false, error: 'Não foi possível encontrar a coleção selecionada.' }
    }
    targetCollectionId = col.id
  } else if (destination.type === 'new') {
    const name = destination.name.trim()
    if (!name) {
      return { ok: false, error: 'Informe um nome para a nova coleção.' }
    }

    const { data: newCol, error } = await supabase.from('collections').insert({ user_id: user.id, nome: name }).select('id').single()

    if (error || !newCol) {
      return { ok: false, error: 'Não foi possível criar a coleção.' }
    }
    targetCollectionId = newCol.id
  }
  // destination.type === 'none' — targetCollectionId stays null, the card just loses this link
  // and falls into "não organizados" (unless it's already linked to some other collection).

  // Link the new collection FIRST, before removing the old one — if this insert fails, the card
  // is untouched (still safely in its original collection) instead of ending up unlinked from
  // everywhere. Worst case on a later failure is a harmless duplicate membership, never data loss.
  if (targetCollectionId) {
    const { error: linkError } = await supabase.from('collection_flashcards').insert({ collection_id: targetCollectionId, flashcard_id: flashcardId })

    if (linkError) {
      return { ok: false, error: 'Não foi possível vincular o card à nova coleção.' }
    }
  }

  const { error: unlinkError } = await supabase
    .from('collection_flashcards')
    .delete()
    .eq('collection_id', currentCollectionId)
    .eq('flashcard_id', flashcardId)

  if (unlinkError) {
    return {
      ok: false,
      error: targetCollectionId
        ? 'O card foi vinculado à nova coleção, mas não foi possível removê-lo da atual.'
        : 'Não foi possível remover o card da coleção atual.',
    }
  }

  return { ok: true, movedAway: true }
}
