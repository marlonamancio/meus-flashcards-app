'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { CollectionDetail } from '@/lib/collections-data'

// Read-only browsing of a collection's cards — flip to see the answer, step forward/back with
// buttons (no swipe, same convention as the rest of the app). Deliberately isolated from the
// study flow: no server actions imported here at all, so there is no way for this screen to ever
// write to flashcard_responses or flashcard_schedule, touch due_date, streaks, the daily goal, or
// badges. See CLAUDE.md item 11 and USER_STORIES.md US34.
export function BrowseSession({ collection, initialIndex }: { collection: CollectionDetail; initialIndex: number }) {
  const cards = collection.cards
  const [index, setIndex] = useState(initialIndex)
  const [flipped, setFlipped] = useState(false)

  const card = cards[index]
  const isFirst = index === 0
  const isLast = index === cards.length - 1

  function goTo(nextIndex: number) {
    setIndex(nextIndex)
    setFlipped(false)
  }

  return (
    <div className="max-w-md mx-auto flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3" style={{ padding: '10px 20px 14px', flex: 'none' }}>
        <Link
          href={`/collection/${collection.id}`}
          aria-label="Fechar"
          className="flex items-center justify-center rounded-[11px] flex-none"
          style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <X size={19} strokeWidth={2.2} />
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-[9px]">
          <div
            className="flex-none flex items-center justify-center rounded-lg text-[11px] font-bold"
            style={{ width: 28, height: 28, background: collection.soft, color: collection.color }}
          >
            {collection.short}
          </div>
          <div className="min-w-0">
            <div className="text-[9.5px] font-bold uppercase" style={{ letterSpacing: '0.06em', color: 'var(--muted)', lineHeight: 1.1 }}>
              Navegando
            </div>
            <div className="text-[13.5px] font-bold truncate" style={{ letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {collection.nome}
            </div>
          </div>
        </div>
        <span className="text-xs font-bold flex-none" style={{ color: 'var(--muted)' }}>
          {index + 1} / {cards.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col" style={{ padding: '8px 22px 20px', minHeight: 0 }}>
        <div className="flex-1 relative" style={{ perspective: 1600, minHeight: 0 }}>
          <div
            onClick={() => setFlipped((f) => !f)}
            className="relative w-full h-full"
            style={{
              cursor: 'pointer',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s cubic-bezier(.4,.15,.2,1)',
              transform: flipped ? 'rotateY(180deg)' : 'none',
            }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 24,
                boxShadow: 'var(--shadow)',
                padding: '32px 26px',
                overflowY: 'auto',
              }}
            >
              <span
                className="text-[11px] font-bold uppercase absolute"
                style={{ letterSpacing: '0.08em', color: collection.color, top: 22, left: 24 }}
              >
                Pergunta
              </span>
              <div className="text-[21px] font-semibold" style={{ lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                {card.frente}
              </div>
              <div className="absolute text-xs flex items-center gap-1.5" style={{ bottom: 22, color: 'var(--muted)' }}>
                toque para virar
              </div>
            </div>

            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 24,
                boxShadow: 'var(--shadow)',
                padding: '32px 26px',
                overflowY: 'auto',
              }}
            >
              <span
                className="text-[11px] font-bold uppercase absolute"
                style={{ letterSpacing: '0.08em', color: 'var(--accent)', top: 22, left: 24 }}
              >
                Resposta
              </span>
              <div className="text-[17px] font-medium" style={{ lineHeight: 1.5 }}>
                {card.verso}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-[11px]" style={{ marginTop: 18, flex: 'none' }}>
          <button
            onClick={() => goTo(index - 1)}
            disabled={isFirst}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold disabled:opacity-40"
            style={{ padding: 16, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft size={19} strokeWidth={2.3} />
            Anterior
          </button>
          <button
            onClick={() => goTo(index + 1)}
            disabled={isLast}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold disabled:opacity-40"
            style={{ padding: 16, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            Próximo
            <ChevronRight size={19} strokeWidth={2.3} />
          </button>
        </div>
      </div>
    </div>
  )
}
