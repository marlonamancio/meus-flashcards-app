'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'

export type UpdateFlashcardResult = { ok: true } | { ok: false; error: string }

// Browse-mode card editing (CLAUDE.md item 11, "Edição do card"). Touches ONLY
// flashcards.frente/verso — never flashcard_responses or flashcard_schedule, keeping the same
// SM-2 isolation the rest of browse mode already guarantees (see BrowseSession.tsx).
export async function updateFlashcardAction(flashcardId: string, frente: string, verso: string): Promise<UpdateFlashcardResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const trimmedFrente = frente.trim()
  const trimmedVerso = verso.trim()

  if (!trimmedFrente || !trimmedVerso) {
    return { ok: false, error: 'Preencha a frente e o verso do card.' }
  }

  const { error } = await supabase
    .from('flashcards')
    .update({ frente: trimmedFrente, verso: trimmedVerso })
    .eq('id', flashcardId)
    .eq('user_id', user.id)

  if (error) {
    return { ok: false, error: 'Não foi possível salvar as alterações.' }
  }

  return { ok: true }
}
