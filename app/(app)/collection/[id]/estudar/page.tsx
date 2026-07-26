import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionDetail } from '@/lib/collections-data'
import { getDueMap } from '@/lib/flashcard-schedule'
import { orderByPriority } from '@/lib/study-order'
import { StudySession } from '@/components/study/StudySession'

export default async function EstudarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collection = await getCollectionDetail(supabase, user.id, id)
  if (!collection) notFound()
  if (collection.cards.length === 0) redirect(`/collection/${id}`)

  const dueMap = await getDueMap(
    supabase,
    user.id,
    collection.cards.map((c) => c.id)
  )
  const dueCards = collection.cards.filter((c) => dueMap.has(c.id))
  // Nothing due today — send back to the collection page, which shows the "volte amanhã"
  // message instead of the study button in that case.
  if (dueCards.length === 0) redirect(`/collection/${id}`)

  const initialQueue = orderByPriority(dueCards.map((c) => ({ id: c.id, daysOverdue: dueMap.get(c.id) ?? null }))).map((c) => c.id)

  return <StudySession collection={collection} initialQueue={initialQueue} />
}
