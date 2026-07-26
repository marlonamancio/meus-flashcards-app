'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Flame, Meh, X, Zap } from 'lucide-react'
import type { CollectionDetail } from '@/lib/collections-data'
import { recordStudyResponseAction } from '@/app/(app)/collection/[id]/estudar/actions'
import { Alert } from '@/components/ui/Alert'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The 4-level rating (Anki/SM-2 style Again/Hard/Good/Easy) — index doubles as the `rating`
// value (0-3) sent to recordStudyResponseAction. `solid` is used as the button background only
// for "Fácil demais" (the one rating meant to stand out as unambiguously positive); the other
// three use `soft` as background and `solid` as text/icon color instead.
const RATING_OPTIONS = [
  { rating: 0, label: 'Não lembrei', Icon: X, soft: 'var(--bad-soft)', solid: 'var(--bad)' },
  { rating: 1, label: 'Foi difícil', Icon: Meh, soft: 'var(--accent-soft)', solid: 'var(--accent-strong)' },
  { rating: 2, label: 'Fui bem', Icon: Check, soft: 'var(--good-soft)', solid: 'var(--good)' },
  { rating: 3, label: 'Fácil demais', Icon: Zap, soft: 'var(--good-soft)', solid: 'var(--good)' },
] as const

export function StudySession({ collection, initialQueue }: { collection: CollectionDetail; initialQueue: string[] }) {
  const cards = collection.cards
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])

  // No manual navigation: cards due today not yet answered in this session are shown one at a
  // time, in the order computed server-side (most overdue first, with a random jitter mixed in —
  // see lib/study-order.ts). `queue` only ever shrinks as cards are answered.
  const [queue, setQueue] = useState<string[]>(initialQueue)
  const [sessionTotal] = useState(initialQueue.length)
  const [flipped, setFlipped] = useState(false)
  const [feedback, setFeedback] = useState<0 | 1 | 2 | 3 | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [ratingCounts, setRatingCounts] = useState<[number, number, number, number]>([0, 0, 0, 0])
  const [done, setDone] = useState(false)

  async function handleAnswer(rating: 0 | 1 | 2 | 3) {
    if (submitting) return

    setSubmitting(true)
    setActionError(null)
    setFeedback(rating)

    const cardId = queue[0]
    const remainingQueue = queue.slice(1)
    const isLastCard = remainingQueue.length === 0

    const [result] = await Promise.all([recordStudyResponseAction(cardId, rating), wait(550)])

    if (!result.ok) {
      setFeedback(null)
      setSubmitting(false)
      setActionError(result.error)
      return
    }

    setRatingCounts((counts) => {
      const next = [...counts] as [number, number, number, number]
      next[rating] += 1
      return next
    })

    setFeedback(null)
    setFlipped(false)
    setSubmitting(false)
    setQueue(remainingQueue)

    if (isLastCard) setDone(true)
  }

  if (done) {
    const answeredCount = ratingCounts.reduce((a, b) => a + b, 0)

    return (
      <div className="max-w-md mx-auto flex flex-col" style={{ height: '100dvh' }}>
        <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: 30 }}>
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 80,
              height: 80,
              marginBottom: 22,
              background: 'radial-gradient(120% 120% at 30% 20%, var(--accent), var(--accent-strong))',
              boxShadow: '0 14px 34px var(--accent-soft)',
              animation: 'pop 0.5s ease both',
            }}
          >
            <Flame size={40} style={{ color: 'var(--on-accent)', animation: 'flamefloat 2.6s ease-in-out infinite' }} fill="var(--on-accent)" />
          </div>
          <div className="text-[22px] font-bold" style={{ letterSpacing: '-0.02em' }}>
            Sessão concluída!
          </div>
          <div className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Você revisou {answeredCount} card{answeredCount === 1 ? '' : 's'} de {collection.nome}.
          </div>

          <div className="grid grid-cols-2 gap-3 mt-[26px] w-full" style={{ maxWidth: 280 }}>
            {RATING_OPTIONS.map(({ rating, label, soft, solid }) => (
              <div key={rating} className="rounded-2xl" style={{ padding: 16, background: soft }}>
                <div className="text-[22px] font-bold" style={{ color: solid }}>
                  {ratingCounts[rating]}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {label.toLowerCase()}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 mt-7 w-full" style={{ maxWidth: 280 }}>
            <Link
              href={`/collection/${collection.id}`}
              className="text-center rounded-xl text-[15px] font-semibold"
              style={{ padding: 15, color: 'var(--on-accent)', background: 'var(--accent)' }}
            >
              Voltar à coleção
            </Link>
            <Link href="/home" className="text-center text-[13.5px] font-semibold" style={{ padding: 10, color: 'var(--muted)' }}>
              Ir para o início
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const card = cardsById.get(queue[0])!
  const answeredCount = ratingCounts.reduce((a, b) => a + b, 0)
  const progressPct = Math.round((answeredCount / sessionTotal) * 100)
  const positionLabel = Math.min(answeredCount + 1, sessionTotal)
  const feedbackOption = feedback !== null ? RATING_OPTIONS[feedback] : null

  return (
    <div className="max-w-md mx-auto flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3" style={{ padding: '10px 20px 14px', flex: 'none' }}>
        <button
          type="button"
          onClick={() => setDone(true)}
          disabled={submitting}
          aria-label="Fechar"
          className="flex items-center justify-center rounded-[11px] flex-none disabled:opacity-60"
          style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <X size={19} strokeWidth={2.2} />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-[9px]">
          <div
            className="flex-none flex items-center justify-center rounded-lg text-[11px] font-bold"
            style={{ width: 28, height: 28, background: collection.soft, color: collection.color }}
          >
            {collection.short}
          </div>
          <div className="min-w-0">
            <div className="text-[9.5px] font-bold uppercase" style={{ letterSpacing: '0.06em', color: 'var(--muted)', lineHeight: 1.1 }}>
              Estudando
            </div>
            <div className="text-[13.5px] font-bold truncate" style={{ letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {collection.nome}
            </div>
          </div>
        </div>
        <span className="text-xs font-bold flex-none" style={{ color: 'var(--muted)' }}>
          {positionLabel} / {sessionTotal}
        </span>
      </div>

      <div style={{ padding: '0 20px 12px', flex: 'none' }}>
        <div className="rounded-full overflow-hidden" style={{ height: 7, background: 'var(--surface-2)' }}>
          <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: `${progressPct}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col" style={{ padding: '8px 22px 20px', minHeight: 0 }}>
        <div className="flex-1 relative" style={{ perspective: 1600, minHeight: 0 }}>
          <div
            onClick={submitting ? undefined : () => setFlipped((f) => !f)}
            className="relative w-full h-full"
            style={{
              cursor: submitting ? 'default' : 'pointer',
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

          {feedbackOption && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: feedbackOption.soft, zIndex: 9, borderRadius: 24 }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 96, height: 96, background: feedbackOption.solid, boxShadow: `0 16px 40px ${feedbackOption.soft}`, animation: 'pop 0.45s ease both' }}
              >
                <feedbackOption.Icon size={42} color="#fff" strokeWidth={2.6} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-[9px]" style={{ marginTop: 18, flex: 'none' }}>
          {RATING_OPTIONS.map(({ rating, label, Icon, soft, solid }) => {
            const strong = rating === 3
            return (
              <button
                key={rating}
                onClick={() => handleAnswer(rating)}
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-2xl text-[13.5px] font-bold disabled:opacity-60"
                style={{ padding: 14, background: strong ? solid : soft, color: strong ? '#fff' : solid, border: '1px solid transparent' }}
              >
                <Icon size={17} strokeWidth={2.4} />
                {label}
              </button>
            )
          })}
        </div>

        {actionError && <Alert style={{ marginTop: 12 }}>{actionError}</Alert>}
      </div>
    </div>
  )
}
