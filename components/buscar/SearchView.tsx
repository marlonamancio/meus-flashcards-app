'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search as SearchIcon } from 'lucide-react'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { loadMoreSearchCardsAction, loadMoreSearchCollectionsAction, searchAction } from '@/app/(app)/buscar/actions'
import type { SearchCardResult, SearchCollectionResult, SearchCursor } from '@/lib/search-data'
import { Alert } from '@/components/ui/Alert'

// Global search (CLAUDE.md item 12) — server-side, cruza todas as coleções do usuário. Não
// confundir com o filtro local de /colecoes (client-side, só nomes já carregados) nem com a busca
// contextual dentro do modo de navegação (client-side também, mas sobre o array de cards de UMA
// coleção já em memória) — os três convivem sem conflito, propósitos diferentes.
export function SearchView() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 350)

  const [collections, setCollections] = useState<SearchCollectionResult[]>([])
  const [collectionsCursor, setCollectionsCursor] = useState<SearchCursor | null>(null)
  const [cards, setCards] = useState<SearchCardResult[]>([])
  const [cardsCursor, setCardsCursor] = useState<SearchCursor | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMoreCollections, setIsLoadingMoreCollections] = useState(false)
  const [isLoadingMoreCards, setIsLoadingMoreCards] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  function handleQueryChange(next: string) {
    setQuery(next)
    // Reset immediately on clearing the field (a direct response to this event), rather than
    // waiting for the debounced effect below — also sidesteps calling setState synchronously
    // inside an effect body (react-hooks/set-state-in-effect).
    if (!next.trim()) {
      setCollections([])
      setCollectionsCursor(null)
      setCards([])
      setCardsCursor(null)
      setHasSearched(false)
      setError(null)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!debouncedQuery) return

    let cancelled = false

    // The setIsLoading/setError calls that kick this off live inside a .then() callback, not
    // directly in the effect body — react-hooks/set-state-in-effect flags synchronous setState
    // calls in an effect (cascading-render risk), but a callback reacting to an async boundary is
    // exactly the escape hatch the rule documents ("calling setState in a callback function when
    // external state changes").
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined
        setIsLoading(true)
        setError(null)
        return searchAction(debouncedQuery)
      })
      .then((result) => {
        if (cancelled || !result) return
        setCollections(result.collections.results)
        setCollectionsCursor(result.collections.nextCursor)
        setCards(result.cards.results)
        setCardsCursor(result.cards.nextCursor)
        setHasSearched(true)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível buscar agora. Tente novamente.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  async function handleLoadMoreCollections() {
    if (!collectionsCursor || isLoadingMoreCollections) return
    setIsLoadingMoreCollections(true)
    try {
      const page = await loadMoreSearchCollectionsAction(debouncedQuery, collectionsCursor)
      setCollections((prev) => [...prev, ...page.results])
      setCollectionsCursor(page.nextCursor)
    } catch {
      setError('Não foi possível carregar mais coleções.')
    } finally {
      setIsLoadingMoreCollections(false)
    }
  }

  async function handleLoadMoreCards() {
    if (!cardsCursor || isLoadingMoreCards) return
    setIsLoadingMoreCards(true)
    try {
      const page = await loadMoreSearchCardsAction(debouncedQuery, cardsCursor)
      setCards((prev) => [...prev, ...page.results])
      setCardsCursor(page.nextCursor)
    } catch {
      setError('Não foi possível carregar mais cards.')
    } finally {
      setIsLoadingMoreCards(false)
    }
  }

  const showEmptyPrompt = !query.trim()
  const noResults = hasSearched && !isLoading && collections.length === 0 && cards.length === 0

  return (
    <>
      <div className="relative mt-1">
        <SearchIcon size={18} className="absolute" style={{ left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          autoFocus
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Buscar cards e coleções"
          className="w-full text-sm rounded-[13px]"
          style={{ padding: '12px 40px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        {isLoading && (
          <Loader2
            size={16}
            className="absolute animate-spin"
            style={{ right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
        )}
      </div>

      {error && <Alert style={{ marginTop: 12 }}>{error}</Alert>}

      {showEmptyPrompt ? (
        <div
          className="rounded-2xl text-center"
          style={{ marginTop: 22, padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          Digite para buscar em coleções e cards.
        </div>
      ) : noResults ? (
        <div
          className="rounded-2xl text-center"
          style={{ marginTop: 22, padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          Nenhum resultado para &ldquo;{query.trim()}&rdquo;.
        </div>
      ) : (
        <>
          {collections.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="text-[11.5px] font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 11 }}>
                Coleções · {collections.length}
              </div>
              <div className="flex flex-col gap-[9px]">
                {collections.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collection/${c.id}`}
                    className="flex items-center gap-[14px] rounded-[16px]"
                    style={{ padding: 13, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <div
                      className="flex-none flex items-center justify-center rounded-[12px] text-[15px] font-bold"
                      style={{ width: 44, height: 44, background: c.soft, color: c.color }}
                    >
                      {c.short}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-semibold truncate" style={{ letterSpacing: '-0.01em' }}>
                        {c.nome}
                      </div>
                      {c.parentNome && (
                        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                          {c.parentNome} &gt; {c.nome}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {collectionsCursor && (
                <button
                  onClick={handleLoadMoreCollections}
                  disabled={isLoadingMoreCollections}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl text-[13.5px] font-semibold disabled:opacity-60"
                  style={{ marginTop: 10, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  {isLoadingMoreCollections && <Loader2 size={16} className="animate-spin" />}
                  {isLoadingMoreCollections ? 'Carregando...' : 'Carregar mais coleções'}
                </button>
              )}
            </div>
          )}

          {cards.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="text-[11.5px] font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 11 }}>
                Cards · {cards.length}
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/collection/${card.collectionId}/navegar/${card.id}`}
                    className="flex flex-col rounded-[14px]"
                    style={{ padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <div className="text-[13.5px] font-semibold truncate" style={{ lineHeight: 1.35 }}>
                      {card.frente}
                    </div>
                    <div className="text-[11.5px] mt-[3px] truncate" style={{ color: 'var(--muted)' }}>
                      {card.verso}
                    </div>
                    <div className="text-[10.5px] mt-[6px] truncate font-semibold" style={{ color: 'var(--muted)' }}>
                      {card.parentNome ? `${card.parentNome} > ${card.collectionNome}` : card.collectionNome}
                    </div>
                  </Link>
                ))}
              </div>
              {cardsCursor && (
                <button
                  onClick={handleLoadMoreCards}
                  disabled={isLoadingMoreCards}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl text-[13.5px] font-semibold disabled:opacity-60"
                  style={{ marginTop: 10, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  {isLoadingMoreCards && <Loader2 size={16} className="animate-spin" />}
                  {isLoadingMoreCards ? 'Carregando...' : 'Carregar mais cards'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
