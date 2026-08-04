import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionStudyMeta, getCollectionCardIds, getFlashcardsByIds } from '@/lib/collections-data'
import { getDueMap } from '@/lib/flashcard-schedule'
import { orderByPriority } from '@/lib/study-order'
import { StudySession } from '@/components/study/StudySession'

export default async function EstudarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  // Meta (avatar/nome) and the collection's flashcard ids run in parallel — neither depends on
  // the other, and cardIds alone is enough to compute the due map without waiting on anything
  // else (see CLAUDE.md "Performance — paralelização de getDueMap").
  const [meta, cardIds] = await Promise.all([
    getCollectionStudyMeta(supabase, user.id, id),
    getCollectionCardIds(supabase, user.id, id),
  ])
  if (!meta) notFound()
  if (cardIds.length === 0) redirect(`/collection/${id}`)

  const dueMap = await getDueMap(supabase, user.id, cardIds)
  const dueIds = cardIds.filter((cardId) => dueMap.has(cardId))
  // Nothing due today — send back to the collection page, which shows the "volte amanhã"
  // message instead of the study button in that case.
  if (dueIds.length === 0) redirect(`/collection/${id}`)

  const initialQueue = orderByPriority(dueIds.map((cardId) => ({ id: cardId, daysOverdue: dueMap.get(cardId) ?? null }))).map((c) => c.id)

  // Content (frente/verso) is fetched only for the cards actually due today, not the whole
  // collection — a 166-card collection with 5 due today downloads 5 cards' content, not 166 (see
  // CLAUDE.md "Decisão adicional — Estudar deve buscar só o conteúdo dos cards vencidos").
  const dueCards = await getFlashcardsByIds(supabase, user.id, dueIds)

  return <StudySession collection={{ ...meta, cards: dueCards }} initialQueue={initialQueue} />
}
