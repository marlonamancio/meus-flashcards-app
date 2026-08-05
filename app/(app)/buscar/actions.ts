'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import {
  searchCards,
  searchCollections,
  type SearchCardsPage,
  type SearchCollectionsPage,
  type SearchCursor,
} from '@/lib/search-data'

export type SearchActionResult = {
  collections: SearchCollectionsPage
  cards: SearchCardsPage
}

const EMPTY_RESULT: SearchActionResult = {
  collections: { results: [], nextCursor: null },
  cards: { results: [], nextCursor: null },
}

export async function searchAction(query: string): Promise<SearchActionResult> {
  const trimmed = query.trim()
  if (!trimmed) return EMPTY_RESULT

  const supabase = await createClient()
  const user = await requireUser(supabase)

  const [collections, cards] = await Promise.all([
    searchCollections(supabase, user.id, trimmed, null),
    searchCards(supabase, user.id, trimmed, null),
  ])

  return { collections, cards }
}

export async function loadMoreSearchCollectionsAction(query: string, cursor: SearchCursor): Promise<SearchCollectionsPage> {
  const trimmed = query.trim()
  if (!trimmed) return { results: [], nextCursor: null }

  const supabase = await createClient()
  const user = await requireUser(supabase)
  return searchCollections(supabase, user.id, trimmed, cursor)
}

export async function loadMoreSearchCardsAction(query: string, cursor: SearchCursor): Promise<SearchCardsPage> {
  const trimmed = query.trim()
  if (!trimmed) return { results: [], nextCursor: null }

  const supabase = await createClient()
  const user = await requireUser(supabase)
  return searchCards(supabase, user.id, trimmed, cursor)
}
