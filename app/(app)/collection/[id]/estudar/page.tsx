import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionDetail } from '@/lib/collections-data'
import { getSeenFlashcardIds } from '@/lib/study-progress'
import { StudySession } from '@/components/study/StudySession'

export default async function EstudarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collection = await getCollectionDetail(supabase, user.id, id)
  if (!collection) notFound()
  if (collection.cards.length === 0) redirect(`/collection/${id}`)

  const seenIds = await getSeenFlashcardIds(supabase, user.id, id)
  // First card in the existing (criado_em) order that hasn't been answered in this pass yet. If
  // every card is already marked seen (e.g. the previous pass's cleanup didn't run), fall back to
  // the start rather than rendering an empty session.
  const resumeIndex = collection.cards.findIndex((c) => !seenIds.has(c.id))
  const initialIndex = resumeIndex === -1 ? 0 : resumeIndex

  return <StudySession collection={collection} initialIndex={initialIndex} />
}
