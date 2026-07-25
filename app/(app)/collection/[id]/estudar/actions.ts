'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { BADGE_DEFS, addDaysToDateString, brasiliaDateString } from '@/lib/home-data'

export type RecordStudyResponseResult = { ok: true } | { ok: false; error: string }

export type ResetStudyProgressResult = { ok: true } | { ok: false; error: string }

// "Começar do zero" from the resume-or-restart dialog: discards the in-progress pass for this
// collection specifically (study_progress rows), without touching flashcard_responses — the
// answers already given stay in the history, only the resume pointer is cleared.
export async function resetStudyProgressAction(collectionId: string): Promise<ResetStudyProgressResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { error } = await supabase.from('study_progress').delete().eq('user_id', user.id).eq('collection_id', collectionId)

  if (error) {
    return { ok: false, error: 'Não foi possível reiniciar a sessão. Tente novamente.' }
  }

  return { ok: true }
}

export async function recordStudyResponseAction(
  flashcardId: string,
  collectionId: string,
  acertou: boolean,
  isLastCard: boolean
): Promise<RecordStudyResponseResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  // The response itself is the record that matters — insert it before touching any of the
  // streak/goal/badge bookkeeping below, so a bug or transient failure in that bookkeeping can
  // never cause an answer to go unsaved.
  const { error: insertError } = await supabase.from('flashcard_responses').insert({ user_id: user.id, flashcard_id: flashcardId, acertou })

  if (insertError) {
    return { ok: false, error: 'Não foi possível salvar sua resposta. Tente novamente.' }
  }

  try {
    await updateStudyProgress(supabase, user.id)
  } catch {
    // Best-effort: the response above is already saved: a hiccup in streak/badge bookkeeping
    // shouldn't interrupt the study session or make the UI look like the answer was lost.
  }

  try {
    await updateResumeState(supabase, user.id, collectionId, flashcardId, isLastCard)
  } catch {
    // Best-effort too: at worst the next session resumes from the wrong card instead of losing
    // the answer that's already safely recorded above.
  }

  return { ok: true }
}

// Marks this card as seen in the collection's current study pass (see
// supabase/migrations/009_study_progress.sql). On the last card of the pass, clears all of the
// collection's progress rows instead — a completed pass means the next session starts fresh,
// so there is nothing left to resume.
async function updateResumeState(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
  flashcardId: string,
  isLastCard: boolean
): Promise<void> {
  if (isLastCard) {
    await supabase.from('study_progress').delete().eq('user_id', userId).eq('collection_id', collectionId)
    return
  }

  await supabase
    .from('study_progress')
    .upsert(
      { user_id: userId, collection_id: collectionId, flashcard_id: flashcardId },
      { onConflict: 'user_id,collection_id,flashcard_id', ignoreDuplicates: true }
    )
}

async function updateStudyProgress(supabase: SupabaseClient, userId: string): Promise<void> {
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
