import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const WEEK_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // Segunda a Domingo

export type WeekDay = {
  label: string
  isToday: boolean
  completed: boolean
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
}

const COLLECTION_PALETTE = [
  { color: 'var(--accent-strong)', soft: 'var(--accent-soft)' },
  { color: 'var(--good)', soft: 'var(--good-soft)' },
  { color: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
  { color: '#db2777', soft: 'rgba(219,39,119,.14)' },
]

// A failed query (missing table, RLS denial, network error) must not be mistaken for "no rows
// yet" — the caller renders an honest empty state for the latter, so a query error has to
// surface loudly instead of silently producing the same zeros/empty-array shape.
function assertNoError(error: PostgrestError | null, context: string): void {
  if (error) {
    throw new Error(`Falha ao consultar ${context}: ${error.message}`)
  }
}

function initials(nome: string): string {
  const words = nome.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(d.getDate() + diff)
  return monday
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
  const today = new Date()
  const monday = startOfWeekMonday(today)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const { data, error } = await supabase
    .from('daily_activity')
    .select('data, meta_atingida')
    .eq('user_id', userId)
    .gte('data', toISODate(days[0]))
    .lte('data', toISODate(days[6]))

  assertNoError(error, 'daily_activity')

  const completedDates = new Set((data ?? []).filter((r) => r.meta_atingida).map((r) => r.data))
  const todayISO = toISODate(today)

  return days.map((d, i) => ({
    label: WEEK_LABELS[i],
    isToday: toISODate(d) === todayISO,
    completed: completedDates.has(toISODate(d)),
  }))
}

const BADGE_DEFS: { tipo: BadgeInfo['tipo']; label: string; target: number }[] = [
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
    .select('id, nome, criado_em')
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
