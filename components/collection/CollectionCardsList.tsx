'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { CardsCursor, CollectionCard } from '@/lib/collections-data'
import { loadMoreCardsAction } from '@/app/(app)/collection/[id]/actions'
import { Alert } from '@/components/ui/Alert'

// Cursor-based "Carregar mais" (CLAUDE.md "Performance — paginação da lista de cards da
// coleção") — no infinite scroll, a deliberate simplicity choice (no IntersectionObserver, no
// risk of firing too many fetches on a fast scroll). The collection-wide card count/accuracy
// stats shown above this list (CollectionPage) are unaffected by pagination — only this list of
// individual cards loads incrementally.
export function CollectionCardsList({
  collectionId,
  initialCards,
  initialNextCursor,
}: {
  collectionId: string
  initialCards: CollectionCard[]
  initialNextCursor: CardsCursor | null
}) {
  const [cards, setCards] = useState(initialCards)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  if (cards.length === 0) {
    return (
      <div
        className="rounded-2xl text-center"
        style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
      >
        Nenhum card nesta coleção ainda.
      </div>
    )
  }

  return (
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
  )
}
