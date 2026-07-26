import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionDetail } from '@/lib/collections-data'
import { BrowseSession } from '@/components/collection/BrowseSession'

export default async function NavegarPage({ params }: { params: Promise<{ id: string; cardId: string }> }) {
  const { id, cardId } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collection = await getCollectionDetail(supabase, user.id, id)
  if (!collection) notFound()

  // Same order already shown in the collection's card list — browsing intentionally ignores the
  // SM-2 due/priority ordering, that's exclusive to the study mode (see CLAUDE.md item 11).
  const initialIndex = collection.cards.findIndex((c) => c.id === cardId)
  if (initialIndex === -1) notFound()

  return <BrowseSession collection={collection} initialIndex={initialIndex} />
}
