import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionDetail } from '@/lib/collections-data'
import { getSeenFlashcardIds } from '@/lib/study-progress'
import { orderByPriority } from '@/lib/study-order'
import { StudySession } from '@/components/study/StudySession'

export default async function EstudarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collection = await getCollectionDetail(supabase, user.id, id)
  if (!collection) notFound()
  if (collection.cards.length === 0) redirect(`/collection/${id}`)

  const seenIds = await getSeenFlashcardIds(supabase, user.id, id)
  let pending = collection.cards.filter((c) => !seenIds.has(c.id))
  // Defensive: if every card is already marked seen (e.g. the previous pass's cleanup didn't
  // run), treat it as a fresh pass over the whole collection rather than rendering an empty
  // session.
  if (pending.length === 0) pending = collection.cards

  const initialQueue = orderByPriority(pending).map((c) => c.id)

  return <StudySession collection={collection} initialQueue={initialQueue} />
}
