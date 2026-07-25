'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Flame, X } from 'lucide-react'
import type { CollectionDetail } from '@/lib/collections-data'
import { recordStudyResponseAction } from '@/app/(app)/collection/[id]/estudar/actions'
import { Alert } from '@/components/ui/Alert'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function StudySession({ collection, initialIndex = 0 }: { collection: CollectionDetail; initialIndex?: number }) {
  const cards = collection.cards
  const total = cards.length

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [flipped, setFlipped] = useState(false)
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [knownCount, setKnownCount] = useState(0)
  const [unknownCount, setUnknownCount] = useState(0)
  const [done, setDone] = useState(false)

  function handleRestart() {
    setCurrentIndex(0)
    setFlipped(false)
    setFeedback(null)
    setSubmitting(false)
    setActionError(null)
    setKnownCount(0)
    setUnknownCount(0)
    setDone(false)
  }

  async function handleAnswer(acertou: boolean) {
    if (submitting) return

    setSubmitting(true)
    setActionError(null)
    setFeedback(acertou ? 'yes' : 'no')

    const card = cards[currentIndex]
    const isLastCard = currentIndex + 1 >= total
    const [result] = await Promise.all([
      recordStudyResponseAction(card.id, collection.id, acertou, isLastCard),
      wait(550),
    ])

    if (!result.ok) {
      setFeedback(null)
      setSubmitting(false)
      setActionError(result.error)
      return
    }

    if (acertou) setKnownCount((c) => c + 1)
    else setUnknownCount((c) => c + 1)

    setFeedback(null)
    setFlipped(false)
    setSubmitting(false)

    if (currentIndex + 1 >= total) {
      setDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  if (done) {
    const answeredCount = knownCount + unknownCount

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

          <div className="flex gap-3 mt-[26px] w-full" style={{ maxWidth: 280 }}>
            <div className="flex-1 rounded-2xl" style={{ padding: 16, background: 'var(--good-soft)' }}>
              <div className="text-[26px] font-bold" style={{ color: 'var(--good)' }}>
                {knownCount}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                sabia
              </div>
            </div>
            <div className="flex-1 rounded-2xl" style={{ padding: 16, background: 'var(--bad-soft)' }}>
              <div className="text-[26px] font-bold" style={{ color: 'var(--bad)' }}>
                {unknownCount}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                não sabia
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-7 w-full" style={{ maxWidth: 280 }}>
            <button
              onClick={handleRestart}
              className="rounded-xl text-[15px] font-semibold"
              style={{ padding: 15, color: 'var(--on-accent)', background: 'var(--accent)' }}
            >
              Estudar novamente
            </button>
            <Link
              href={`/collection/${collection.id}`}
              className="text-center rounded-xl text-[15px] font-semibold"
              style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
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

  const card = cards[currentIndex]
  const progressPct = Math.round((currentIndex / total) * 100)

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
          {currentIndex + 1} / {total}
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

          {feedback && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: feedback === 'yes' ? 'var(--good-soft)' : 'var(--bad-soft)', zIndex: 9, borderRadius: 24 }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 96,
                  height: 96,
                  background: feedback === 'yes' ? 'var(--good)' : 'var(--bad)',
                  boxShadow: feedback === 'yes' ? '0 16px 40px var(--good-soft)' : '0 16px 40px var(--bad-soft)',
                  animation: 'pop 0.45s ease both',
                }}
              >
                {feedback === 'yes' ? <Check size={46} color="#fff" strokeWidth={3} /> : <X size={42} color="#fff" strokeWidth={3} />}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-[11px]" style={{ marginTop: 18, flex: 'none' }}>
          <button
            onClick={() => handleAnswer(false)}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold disabled:opacity-60"
            style={{ padding: 16, background: 'var(--bad-soft)', color: 'var(--bad)', border: '1px solid transparent' }}
          >
            <X size={19} strokeWidth={2.3} />
            Não sabia
          </button>
          <button
            onClick={() => handleAnswer(true)}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold disabled:opacity-60"
            style={{ padding: 16, background: 'var(--good-soft)', color: 'var(--good)', border: '1px solid transparent' }}
          >
            <Check size={19} strokeWidth={2.6} />
            Sabia
          </button>
        </div>

        {actionError && <Alert style={{ marginTop: 12 }}>{actionError}</Alert>}
      </div>
    </div>
  )
}
