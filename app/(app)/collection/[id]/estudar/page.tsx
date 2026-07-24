import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionDetail } from '@/lib/collections-data'
import { StudySession } from '@/components/study/StudySession'

export default async function EstudarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collection = await getCollectionDetail(supabase, user.id, id)
  if (!collection) notFound()
  if (collection.cards.length === 0) redirect(`/collection/${id}`)

  return <StudySession collection={collection} />
}
