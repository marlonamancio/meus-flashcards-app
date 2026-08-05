'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search as SearchIcon, X } from 'lucide-react'
import type { CardsCursor, CollectionCard } from '@/lib/collections-data'
import { loadMoreCardsAction, searchCollectionCardsAction } from '@/app/(app)/collection/[id]/actions'
import type { SearchCardResult, SearchCursor } from '@/lib/search-data'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { Alert } from '@/components/ui/Alert'
import { IconButton } from '@/components/ui/IconButton'

// Cursor-based "Carregar mais" (CLAUDE.md "Performance — paginação da lista de cards da
// coleção") — no infinite scroll, a deliberate simplicity choice (no IntersectionObserver, no
// risk of firing too many fetches on a fast scroll). The collection-wide card count/accuracy
// stats shown above this list (CollectionPage) are unaffected by pagination — only this list of
// individual cards loads incrementally.
//
// Also owns the "Cards" section header (title + count + search toggle) instead of leaving that to
// the server-rendered page — the search toggle needs client state, and keeping title/count/search
// together in one component avoids splitting one visual section across a server/client boundary.
export function CollectionCardsList({
  collectionId,
  cardCount,
  initialCards,
  initialNextCursor,
}: {
  collectionId: string
  cardCount: number
  initialCards: CollectionCard[]
  initialNextCursor: CardsCursor | null
}) {
  const [cards, setCards] = useState(initialCards)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scoped search (CLAUDE.md item 12, "Busca também na tela de detalhe da coleção") — this list is
  // paginated on purpose and never holds every card in memory, so filtering the `cards` array
  // above (like BrowseSession does) would silently miss cards not yet loaded. Server-side search
  // scoped to this collectionId instead, reusing the same searchCards the global /buscar page
  // calls (see searchCollectionCardsAction).
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 350)

  const [searchResults, setSearchResults] = useState<SearchCardResult[]>([])
  const [searchCursor, setSearchCursor] = useState<SearchCursor | null>(null)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [isSearchLoadingMore, setIsSearchLoadingMore] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!debouncedQuery) return

    let cancelled = false

    // setIsSearchLoading/setSearchError live inside the .then() callback, not directly in the
    // effect body — same react-hooks/set-state-in-effect workaround used by SearchView.
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined
        setIsSearchLoading(true)
        setSearchError(null)
        return searchCollectionCardsAction(collectionId, debouncedQuery, null)
      })
      .then((result) => {
        if (cancelled || !result) return
        if (!result.ok) {
          setSearchError(result.error)
          return
        }
        setSearchResults(result.page.results)
        setSearchCursor(result.page.nextCursor)
        setHasSearched(true)
      })
      .catch(() => {
        if (!cancelled) setSearchError('Não foi possível buscar agora. Tente novamente.')
      })
      .finally(() => {
        if (!cancelled) setIsSearchLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, collectionId])

  function openSearch() {
    setIsSearchOpen(true)
  }

  function closeSearch() {
    setIsSearchOpen(false)
    setQuery('')
    setSearchResults([])
    setSearchCursor(null)
    setHasSearched(false)
    setSearchError(null)
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    if (!next.trim()) {
      setSearchResults([])
      setSearchCursor(null)
      setHasSearched(false)
      setSearchError(null)
      setIsSearchLoading(false)
    }
  }

  async function handleLoadMore() {
    if (!nextCursor || isLoading) return

    setIsLoading(true)
    setError(null)
    const result = await loadMoreCardsAction(collectionId, nextCursor)
    setIsLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setCards((prev) => [...prev, ...result.page.cards])
    setNextCursor(result.page.nextCursor)
  }

  async function handleLoadMoreSearch() {
    if (!searchCursor || isSearchLoadingMore) return

    setIsSearchLoadingMore(true)
    const result = await searchCollectionCardsAction(collectionId, debouncedQuery, searchCursor)
    setIsSearchLoadingMore(false)

    if (!result.ok) {
      setSearchError(result.error)
      return
    }

    setSearchResults((prev) => [...prev, ...result.page.results])
    setSearchCursor(result.page.nextCursor)
  }

  return (
    <>
      <div className="flex items-center gap-2" style={{ margin: '22px 0 11px' }}>
        {isSearchOpen ? (
          <div className="relative flex-1">
            <SearchIcon size={15} className="absolute" style={{ left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar cards nesta coleção"
              className="w-full text-sm rounded-[11px]"
              style={{ padding: '8px 12px 8px 34px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
        ) : (
          <div className="flex-1 flex justify-between items-baseline">
            <h2 className="text-[14.5px] font-bold">Cards</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {cardCount}
            </span>
          </div>
        )}
        <IconButton onClick={isSearchOpen ? closeSearch : openSearch} aria-label={isSearchOpen ? 'Fechar busca' : 'Buscar nesta coleção'}>
          {isSearchOpen ? <X size={17} strokeWidth={2.2} /> : <SearchIcon size={17} strokeWidth={2.2} />}
        </IconButton>
      </div>

      {isSearchOpen ? (
        <>
          {searchError && <Alert style={{ marginBottom: 12 }}>{searchError}</Alert>}

          {query.trim() === '' ? (
            <div
              className="rounded-2xl text-center"
              style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
            >
              Digite para buscar nesta coleção.
            </div>
          ) : isSearchLoading && searchResults.length === 0 ? (
            <div className="flex items-center justify-center" style={{ padding: 28 }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--muted)' }} />
            </div>
          ) : hasSearched && searchResults.length === 0 ? (
            <div
              className="rounded-2xl text-center"
              style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
            >
              Nenhum card encontrado.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {searchResults.map((card) => (
                  <Link
                    key={card.id}
                    href={`/collection/${collectionId}/navegar/${card.id}`}
                    className="flex flex-col rounded-[14px]"
                    style={{ padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <div className="text-[13.5px] font-semibold truncate" style={{ lineHeight: 1.35 }}>
                      {card.frente}
                    </div>
                    <div className="text-[11.5px] mt-[3px] truncate" style={{ color: 'var(--muted)' }}>
                      {card.verso}
                    </div>
                  </Link>
                ))}
              </div>

              {searchCursor && (
                <button
                  onClick={handleLoadMoreSearch}
                  disabled={isSearchLoadingMore}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl text-[13.5px] font-semibold disabled:opacity-60"
                  style={{ marginTop: 14, padding: 13, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  {isSearchLoadingMore && <Loader2 size={16} className="animate-spin" />}
                  {isSearchLoadingMore ? 'Carregando...' : 'Carregar mais'}
                </button>
              )}
            </>
          )}
        </>
      ) : cards.length === 0 ? (
        <div
          className="rounded-2xl text-center"
          style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          Nenhum card nesta coleção ainda.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={`/collection/${collectionId}/navegar/${card.id}`}
                className="flex items-center gap-3 rounded-[14px]"
                style={{ padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold truncate" style={{ lineHeight: 1.35 }}>
                    {card.frente}
                  </div>
                  <div className="text-[11.5px] mt-[3px] truncate" style={{ color: 'var(--muted)' }}>
                    {card.verso}
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div
                    className="text-[13px] font-bold"
                    style={{ color: card.accuracyPct === null ? 'var(--muted)' : card.accuracyPct >= 50 ? 'var(--good)' : 'var(--bad)' }}
                  >
                    {card.accuracyPct !== null ? `${card.accuracyPct}%` : '—'}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    acerto
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {error && <Alert style={{ marginTop: 12 }}>{error}</Alert>}

          {nextCursor && (
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full rounded-2xl text-[13.5px] font-semibold disabled:opacity-60"
              style={{ marginTop: 14, padding: 13, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? 'Carregando...' : 'Carregar mais'}
            </button>
          )}
        </>
      )}
    </>
  )
}
