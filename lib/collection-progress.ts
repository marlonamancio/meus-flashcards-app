import type { CollectionSummary } from '@/lib/home-data'

export type CollectionWithAggregate = CollectionSummary & { childCount: number }

// Single pass over the full flat list (as returned by getCollections) to compute, per collection,
// how many children it has and its aggregate card count. A leaf collection's cardCount already IS
// its total, so it passes through unchanged (childCardSumByParent has no entry for it); only a
// mãe's cardCount is bumped to own + children's sum. Shared by every screen that lists collections
// (CLAUDE.md item 5: Home, Coleções, Progresso) so "is this a mãe" and "what's its total card
// count" are computed exactly once, the same way, everywhere — the bug this fixes was exactly this
// logic drifting out of sync between screens (Home/Progresso predate sub-coleções, Coleções
// doesn't).
export function withChildAggregates(collections: CollectionSummary[]): CollectionWithAggregate[] {
  const childCountByParent = new Map<string, number>()
  const childCardSumByParent = new Map<string, number>()

  for (const c of collections) {
    if (!c.parentId) continue
    childCountByParent.set(c.parentId, (childCountByParent.get(c.parentId) ?? 0) + 1)
    childCardSumByParent.set(c.parentId, (childCardSumByParent.get(c.parentId) ?? 0) + c.cardCount)
  }

  return collections.map((c) => ({
    ...c,
    cardCount: c.cardCount + (childCardSumByParent.get(c.id) ?? 0),
    childCount: childCountByParent.get(c.id) ?? 0,
  }))
}

export type CollectionProgressDisplay =
  | { kind: 'parent'; cardCount: number; childCount: number }
  | { kind: 'leaf'; cardCount: number; accuracyPct: number | null }

// Centralizes the mãe vs normal-collection decision (CLAUDE.md item 5, "Lista de coleções") so it
// can't silently diverge between screens again. A mãe never shows a progress bar/percentage (it
// has no cards of its own to be "correct" or "wrong" about) — it shows "N cards · M subcoleções"
// instead. A leaf with 0 cards is a `kind: 'leaf'` with cardCount 0; callers render "—" instead of
// an empty 0%-wide bar for that case (see components/collections/CollectionListItem.tsx).
export function getCollectionProgressDisplay(col: CollectionWithAggregate): CollectionProgressDisplay {
  if (col.childCount > 0) {
    return { kind: 'parent', cardCount: col.cardCount, childCount: col.childCount }
  }
  return { kind: 'leaf', cardCount: col.cardCount, accuracyPct: col.accuracyPct }
}
