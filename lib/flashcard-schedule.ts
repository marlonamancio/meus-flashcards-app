import type { SupabaseClient } from '@supabase/supabase-js'
import { assertNoError, brasiliaDateString } from '@/lib/home-data'
import type { Sm2Result, Sm2State } from '@/lib/sm2'

// Days a flashcard is overdue for review today, keyed by flashcard_id — only flashcards that are
// actually due appear in the map (due_date <= today). A flashcard with no row in
// flashcard_schedule has never been through SM-2 yet, so it's always due too, mapped to `null`
// here (lib/study-order.ts treats that as maximum priority — same "unknown = needs attention"
// convention as before this stage's rewrite).
export async function getDueMap(
  supabase: SupabaseClient,
  userId: string,
  flashcardIds: string[]
): Promise<Map<string, number | null>> {
  const due = new Map<string, number | null>()
  if (flashcardIds.length === 0) return due

  const today = brasiliaDateString(new Date())

  const { data, error } = await supabase
    .from('flashcard_schedule')
    .select('flashcard_id, due_date')
    .eq('user_id', userId)
    .in('flashcard_id', flashcardIds)

  assertNoError(error, 'flashcard_schedule')

  const scheduled = new Set<string>()
  for (const row of data ?? []) {
    scheduled.add(row.flashcard_id as string)
    if (row.due_date <= today) due.set(row.flashcard_id as string, daysBetween(row.due_date as string, today))
  }

  for (const id of flashcardIds) {
    if (!scheduled.has(id)) due.set(id, null)
  }

  return due
}

// Plain calendar-date arithmetic on 'YYYY-MM-DD' strings, parsed as UTC midnight purely as a
// calculation anchor — same approach as addDaysToDateString in lib/home-data.ts.
function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime()
  const b = new Date(`${to}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86_400_000)
}

// Current SM-2 state for one flashcard, or null if it's never been reviewed — exactly the shape
// lib/sm2.ts's applySm2() expects as its starting point.
export async function getScheduleState(supabase: SupabaseClient, userId: string, flashcardId: string): Promise<Sm2State | null> {
  const { data, error } = await supabase
    .from('flashcard_schedule')
    .select('repetitions, interval_days, ease_factor')
    .eq('user_id', userId)
    .eq('flashcard_id', flashcardId)
    .maybeSingle()

  assertNoError(error, 'flashcard_schedule')
  if (!data) return null

  return { repetitions: data.repetitions, intervalDays: data.interval_days, easeFactor: Number(data.ease_factor) }
}

export async function upsertSchedule(supabase: SupabaseClient, userId: string, flashcardId: string, result: Sm2Result): Promise<void> {
  const { error } = await supabase.from('flashcard_schedule').upsert(
    {
      user_id: userId,
      flashcard_id: flashcardId,
      repetitions: result.repetitions,
      interval_days: result.intervalDays,
      ease_factor: result.easeFactor,
      due_date: result.dueDate,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'user_id,flashcard_id' }
  )

  assertNoError(error, 'flashcard_schedule')
}
