import type { SupabaseClient } from '@supabase/supabase-js'
import { assertNoError } from '@/lib/home-data'

// Which flashcards were already answered in the current pass through this collection's study
// mode — used to resume a session closed mid-way (X button) from the next unseen card instead
// of restarting from the first one. See supabase/migrations/009_study_progress.sql.
export async function getSeenFlashcardIds(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('study_progress')
    .select('flashcard_id')
    .eq('user_id', userId)
    .eq('collection_id', collectionId)

  assertNoError(error, 'study_progress')
  return new Set((data ?? []).map((row) => row.flashcard_id as string))
}

// Whether there's an in-progress pass for this collection — i.e. whether "Estudar esta coleção"
// should ask to continue vs. start over instead of just going straight into the study screen.
export async function hasStudyProgress(supabase: SupabaseClient, userId: string, collectionId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('study_progress')
    .select('flashcard_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('collection_id', collectionId)

  assertNoError(error, 'study_progress')
  return (count ?? 0) > 0
}
