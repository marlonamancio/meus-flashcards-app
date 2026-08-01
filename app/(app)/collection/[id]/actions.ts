'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionCardsPage, type CardsCursor, type CollectionCardsPage } from '@/lib/collections-data'

export type LoadMoreCardsResult = { ok: true; page: CollectionCardsPage } | { ok: false; error: string }

export async function loadMoreCardsAction(collectionId: string, cursor: CardsCursor): Promise<LoadMoreCardsResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { data: collection, error } = await supabase.from('collections').select('id').eq('id', collectionId).eq('user_id', user.id).maybeSingle()

  if (error || !collection) {
    return { ok: false, error: 'Coleção não encontrada.' }
  }

  const page = await getCollectionCardsPage(supabase, user.id, collectionId, cursor)
  return { ok: true, page }
}
