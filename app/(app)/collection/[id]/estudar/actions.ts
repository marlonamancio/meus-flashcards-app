'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { BADGE_DEFS, addDaysToDateString, brasiliaDateString } from '@/lib/home-data'
import { applySm2 } from '@/lib/sm2'
import { getScheduleState, upsertSchedule } from '@/lib/flashcard-schedule'

export type RecordStudyResponseResult = { ok: true } | { ok: false; error: string }

// The app's 4-level rating (Não lembrei/Foi difícil/Fui bem/Fácil demais, stored as 0-3) mapped
// to SM-2's own 0-5 quality scale. Kept here rather than in lib/sm2.ts since it's specific to
// this app's UI, not part of the published algorithm — see CLAUDE.md item 6.
const RATING_TO_QUALITY = [0, 3, 4, 5] as const

export async function recordStudyResponseAction(flashcardId: string, rating: number): Promise<RecordStudyResponseResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  // Ownership check before writing anything for this flashcardId — without it, a card belonging
  // to another user could get a flashcard_responses row and flashcard_schedule state written
  // under this user's own id (never leaks the other user's data since every read elsewhere
  // already filters flashcards by user_id, but it's still an unverified cross-user reference this
  // action shouldn't create). See security audit finding on this action.
  const { data: card, error: cardError } = await supabase.from('flashcards').select('id').eq('id', flashcardId).eq('user_id', user.id).maybeSingle()

  if (cardError || !card) {
    return { ok: false, error: 'Card não encontrado.' }
  }

  // The response itself is the record that matters — insert it before touching the SM-2
  // schedule or the streak/goal/badge bookkeeping below, so a bug or transient failure in either
  // can never cause an answer to go unsaved. `acertou` stays a simple derived boolean (rating >=
  // 1) so the existing accuracy stats keep working unchanged.
  const { error: insertError } = await supabase
    .from('flashcard_responses')
    .insert({ user_id: user.id, flashcard_id: flashcardId, acertou: rating >= 1, rating })

  if (insertError) {
    return { ok: false, error: 'Não foi possível salvar sua resposta. Tente novamente.' }
  }

  try {
    await updateSchedule(supabase, user.id, flashcardId, rating)
  } catch {
    // Best-effort: the response above is already saved — a hiccup updating the SM-2 schedule
    // shouldn't interrupt the study session or make the UI look like the answer was lost. Worst
    // case this card's due_date doesn't move and it shows up as due again tomorrow too.
  }

  try {
    await updateDailyProgress(supabase, user.id)
  } catch {
    // Best-effort too: streak/badge bookkeeping is secondary to the answer already being saved.
  }

  return { ok: true }
}

async function updateSchedule(supabase: SupabaseClient, userId: string, flashcardId: string, rating: number): Promise<void> {
  const quality = RATING_TO_QUALITY[rating]
  if (quality === undefined) throw new Error(`rating inválido: ${rating}`)

  const today = brasiliaDateString(new Date())
  const current = await getScheduleState(supabase, userId, flashcardId)
  const result = applySm2(current, quality, today)
  await upsertSchedule(supabase, userId, flashcardId, result)
}

async function updateDailyProgress(supabase: SupabaseClient, userId: string): Promise<void> {
  const now = new Date()
  const today = brasiliaDateString(now)
  const yesterday = addDaysToDateString(today, -1)

  const [{ data: todayActivity }, { data: yesterdayActivity }, { data: statsRow }] = await Promise.all([
    supabase.from('daily_activity').select('id, cards_revisados, meta_atingida').eq('user_id', userId).eq('data', today).maybeSingle(),
    supabase.from('daily_activity').select('meta_atingida').eq('user_id', userId).eq('data', yesterday).maybeSingle(),
    supabase.from('user_stats').select('streak_atual, streak_recorde, meta_diaria_cards, cards_estudados_hoje').eq('user_id', userId).maybeSingle(),
  ])

  const metaDiariaCards = statsRow?.meta_diaria_cards ?? 10
  const currentStreakAtual = statsRow?.streak_atual ?? 0
  const currentStreakRecorde = statsRow?.streak_recorde ?? 0
  const currentCardsEstudadosHoje = statsRow?.cards_estudados_hoje ?? 0

  // cards_revisados/cards_estudados_hoje always increment on every response, regardless of the
  // goal — only the streak logic below is gated on whether the goal was reached.
  const newCardsRevisadosToday = todayActivity ? todayActivity.cards_revisados + 1 : 1
  const newCardsEstudadosHoje = todayActivity ? currentCardsEstudadosHoje + 1 : 1

  // Streak rule: the streak advances the moment the daily goal is actually reached, not on the
  // first response of the day. `wasMetaReachedBefore` reads the *persisted* flag from before
  // this response; `metaAtingida` is a sticky OR with it, so once a day is credited it can
  // never be un-earned later — including by a mid-day change to meta_diaria_cards (the new
  // goal only affects future crossings, never retroactively revokes today's already-earned
  // credit). This also means answering more cards after the goal is hit never re-triggers the
  // increment, since wasMetaReachedBefore is already true for every response after the first
  // crossing.
  const wasMetaReachedBefore = todayActivity?.meta_atingida ?? false
  const metaJustReached = !wasMetaReachedBefore && newCardsRevisadosToday >= metaDiariaCards
  const metaAtingida = wasMetaReachedBefore || newCardsRevisadosToday >= metaDiariaCards

  // Continuity is judged by whether *yesterday's goal* was met, not merely "was there any
  // activity yesterday" — the streak counts consecutive days the goal was hit, so a day with
  // some activity but a missed goal breaks the streak the same as a day with no activity at
  // all. A day only ever contributes to the streak when it's fully credited.
  const yesterdayMetaReached = yesterdayActivity?.meta_atingida ?? false
  const newStreakAtual = metaJustReached ? (yesterdayMetaReached ? currentStreakAtual + 1 : 1) : currentStreakAtual
  const newStreakRecorde = Math.max(currentStreakRecorde, newStreakAtual)

  if (todayActivity) {
    await supabase.from('daily_activity').update({ cards_revisados: newCardsRevisadosToday, meta_atingida: metaAtingida }).eq('id', todayActivity.id)
  } else {
    await supabase.from('daily_activity').insert({ user_id: userId, data: today, cards_revisados: 1, meta_atingida: metaAtingida })
  }

  if (statsRow) {
    await supabase
      .from('user_stats')
      .update({
        streak_atual: newStreakAtual,
        streak_recorde: newStreakRecorde,
        cards_estudados_hoje: newCardsEstudadosHoje,
        ultima_atividade_em: now.toISOString(),
      })
      .eq('user_id', userId)
  } else {
    await supabase.from('user_stats').insert({
      user_id: userId,
      streak_atual: newStreakAtual,
      streak_recorde: newStreakRecorde,
      cards_estudados_hoje: newCardsEstudadosHoje,
      ultima_atividade_em: now.toISOString(),
    })
  }

  const [{ count: totalResponses }, { count: totalCorrect }, { data: earnedBadges }] = await Promise.all([
    supabase.from('flashcard_responses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('flashcard_responses').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('acertou', true),
    supabase.from('badges').select('tipo').eq('user_id', userId),
  ])

  const earnedTypes = new Set((earnedBadges ?? []).map((b) => b.tipo))
  const currentByType: Record<string, number> = {
    cards_revisados: totalResponses ?? 0,
    // Matches the "current" value getBadges() in home-data.ts already shows for this badge
    // (streak_recorde, not streak_atual) — a badge earned for reaching 7 days is about the
    // personal record, not whatever the streak happens to be right now.
    dias_ofensiva: newStreakRecorde,
    acertos: totalCorrect ?? 0,
  }

  const newBadges = BADGE_DEFS.filter((b) => !earnedTypes.has(b.tipo) && currentByType[b.tipo] >= b.target).map((b) => ({
    user_id: userId,
    tipo: b.tipo,
    meta_alvo: b.target,
  }))

  if (newBadges.length > 0) {
    await supabase.from('badges').insert(newBadges)
  }
}
