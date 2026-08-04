import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { COLLECTION_PALETTE, initials } from '@/lib/palette'

export { COLLECTION_PALETTE, initials }

const WEEK_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // Segunda a Domingo

export type WeekDay = {
  label: string
  isToday: boolean
  completed: boolean
  cardsRevisados: number
}

export type OverallStats = {
  streakAtual: number
  totalReviews: number
  avgAccuracyPct: number | null
}

export type UserStats = {
  streakAtual: number
  streakRecorde: number
  metaDiariaCards: number
  cardsEstudadosHoje: number
}

export type BadgeInfo = {
  tipo: 'cards_revisados' | 'dias_ofensiva' | 'acertos'
  label: string
  achieved: boolean
  target: number
  current: number
}

export type CollectionSummary = {
  id: string
  nome: string
  short: string
  color: string
  soft: string
  cardCount: number
  accuracyPct: number | null
  // null = coleção "raiz" (sem mãe); preenchido = coleção-filha de uma sub-coleção de um nível só
  // (CLAUDE.md item 4 "Sub-coleções"). Usado por ColecoesView para agrupar visualmente a lista.
  parentId: string | null
}

// A failed query (missing table, RLS denial, network error) must not be mistaken for "no rows
// yet" — the caller renders an honest empty state for the latter, so a query error has to
// surface loudly instead of silently producing the same zeros/empty-array shape.
export function assertNoError(error: PostgrestError | null, context: string): void {
  if (error) {
    throw new Error(`Falha ao consultar ${context}: ${error.message}`)
  }
}

const TIMEZONE = 'America/Sao_Paulo'

// "Today" for streak/activity purposes is always the user's local (Brasília) calendar date,
// not the server's UTC date. Brasília has been a fixed UTC-3 offset since Brazil stopped
// observing DST in 2019, but going through Intl's timezone-aware formatter (rather than a
// hardcoded "-3 hours") stays correct if that ever changes, and avoids the bug class where
// `.toISOString()` (always UTC) misattributes late-evening Brasília activity to the next
// calendar day.
export function brasiliaDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Pure calendar-date arithmetic on a 'YYYY-MM-DD' string: parsed as UTC midnight purely as a
// calculation anchor (not as a real instant), so this is safe and unambiguous regardless of
// the server's runtime timezone.
export function addDaysToDateString(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function mondayOfWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  const day = d.getUTCDay() // 0 = Sunday — safe here since isoDate is already a plain calendar date
  const diff = day === 0 ? -6 : 1 - day
  return addDaysToDateString(isoDate, diff)
}

export async function getUserStats(supabase: SupabaseClient, userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('streak_atual, streak_recorde, meta_diaria_cards, cards_estudados_hoje')
    .eq('user_id', userId)
    .maybeSingle()

  assertNoError(error, 'user_stats')

  return {
    streakAtual: data?.streak_atual ?? 0,
    streakRecorde: data?.streak_recorde ?? 0,
    metaDiariaCards: data?.meta_diaria_cards ?? 10,
    cardsEstudadosHoje: data?.cards_estudados_hoje ?? 0,
  }
}

export async function getWeekActivity(supabase: SupabaseClient, userId: string): Promise<WeekDay[]> {
  const todayISO = brasiliaDateString(new Date())
  const mondayISO = mondayOfWeek(todayISO)
  const daysISO = Array.from({ length: 7 }, (_, i) => addDaysToDateString(mondayISO, i))

  const { data, error } = await supabase
    .from('daily_activity')
    .select('data, meta_atingida, cards_revisados')
    .eq('user_id', userId)
    .gte('data', daysISO[0])
    .lte('data', daysISO[6])

  assertNoError(error, 'daily_activity')

  const completedDates = new Set((data ?? []).filter((r) => r.meta_atingida).map((r) => r.data))
  const revisadosByDate = new Map((data ?? []).map((r) => [r.data, r.cards_revisados as number]))

  return daysISO.map((iso, i) => ({
    label: WEEK_LABELS[i],
    isToday: iso === todayISO,
    completed: completedDates.has(iso),
    cardsRevisados: revisadosByDate.get(iso) ?? 0,
  }))
}

// Shared by Perfil and Progresso — both show the same "ofensiva / revisões / acerto" headline
// numbers, just styled differently.
export async function getOverallStats(supabase: SupabaseClient, userId: string): Promise<OverallStats> {
  const [{ data: statsRow, error: statsError }, { count: totalReviews, error: totalError }, { count: totalCorrect, error: correctError }] =
    await Promise.all([
      supabase.from('user_stats').select('streak_atual').eq('user_id', userId).maybeSingle(),
      supabase.from('flashcard_responses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('flashcard_responses').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('acertou', true),
    ])

  assertNoError(statsError, 'user_stats')
  assertNoError(totalError, 'flashcard_responses (total)')
  assertNoError(correctError, 'flashcard_responses (acertos)')

  const total = totalReviews ?? 0
  const correct = totalCorrect ?? 0

  return {
    streakAtual: statsRow?.streak_atual ?? 0,
    totalReviews: total,
    avgAccuracyPct: total > 0 ? Math.round((correct / total) * 100) : null,
  }
}

export const BADGE_DEFS: { tipo: BadgeInfo['tipo']; label: string; target: number }[] = [
  { tipo: 'cards_revisados', label: 'Cards revisados', target: 50 },
  { tipo: 'dias_ofensiva', label: 'Dias de ofensiva', target: 7 },
  { tipo: 'acertos', label: 'Acertos', target: 100 },
]

export async function getBadges(
  supabase: SupabaseClient,
  userId: string,
  stats: UserStats
): Promise<BadgeInfo[]> {
  const [
    { count: totalResponses, error: totalError },
    { count: totalCorrect, error: correctError },
    { data: earnedBadges, error: badgesError },
  ] = await Promise.all([
    supabase.from('flashcard_responses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('flashcard_responses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('acertou', true),
    supabase.from('badges').select('tipo, meta_alvo').eq('user_id', userId),
  ])

  assertNoError(totalError, 'flashcard_responses (total)')
  assertNoError(correctError, 'flashcard_responses (acertos)')
  assertNoError(badgesError, 'badges')

  const currentByType: Record<BadgeInfo['tipo'], number> = {
    cards_revisados: totalResponses ?? 0,
    dias_ofensiva: stats.streakRecorde,
    acertos: totalCorrect ?? 0,
  }

  return BADGE_DEFS.map(({ tipo, label, target }) => {
    const earned = (earnedBadges ?? []).filter((b) => b.tipo === tipo)
    const achieved = earned.length > 0
    const bestTarget = achieved ? Math.max(...earned.map((b) => b.meta_alvo)) : target
    return {
      tipo,
      label,
      achieved,
      target: bestTarget,
      current: currentByType[tipo],
    }
  })
}

export async function getCollections(supabase: SupabaseClient, userId: string): Promise<CollectionSummary[]> {
  const { data: collections, error: collectionsError } = await supabase
    .from('collections')
    .select('id, nome, criado_em, parent_id')
    .eq('user_id', userId)
    .order('criado_em', { ascending: false })

  assertNoError(collectionsError, 'collections')

  if (!collections || collections.length === 0) return []

  const collectionIds = collections.map((c) => c.id)

  const [
    { data: links, error: linksError },
    { data: responses, error: responsesError },
  ] = await Promise.all([
    supabase.from('collection_flashcards').select('collection_id, flashcard_id').in('collection_id', collectionIds),
    supabase.from('flashcard_responses').select('flashcard_id, acertou').eq('user_id', userId),
  ])

  assertNoError(linksError, 'collection_flashcards')
  assertNoError(responsesError, 'flashcard_responses')

  const accuracyByFlashcard = new Map<string, { correct: number; total: number }>()
  for (const r of responses ?? []) {
    const entry = accuracyByFlashcard.get(r.flashcard_id) ?? { correct: 0, total: 0 }
    entry.total += 1
    if (r.acertou) entry.correct += 1
    accuracyByFlashcard.set(r.flashcard_id, entry)
  }

  const cardsByCollection = new Map<string, string[]>()
  for (const l of links ?? []) {
    const list = cardsByCollection.get(l.collection_id) ?? []
    list.push(l.flashcard_id)
    cardsByCollection.set(l.collection_id, list)
  }

  return collections.map((c, i) => {
    const cardIds = cardsByCollection.get(c.id) ?? []
    let correct = 0
    let total = 0
    for (const id of cardIds) {
      const entry = accuracyByFlashcard.get(id)
      if (entry) {
        correct += entry.correct
        total += entry.total
      }
    }
    const palette = COLLECTION_PALETTE[i % COLLECTION_PALETTE.length]
    return {
      id: c.id,
      nome: c.nome,
      short: initials(c.nome),
      color: palette.color,
      soft: palette.soft,
      cardCount: cardIds.length,
      accuracyPct: total > 0 ? Math.round((correct / total) * 100) : null,
      parentId: (c.parent_id as string | null) ?? null,
    }
  })
}

export async function getHomeData(userId: string) {
  const supabase = await createClient()
  const stats = await getUserStats(supabase, userId)
  const [week, badges, collections] = await Promise.all([
    getWeekActivity(supabase, userId),
    getBadges(supabase, userId, stats),
    getCollections(supabase, userId),
  ])
  return { stats, week, badges, collections }
}
