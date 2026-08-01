'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Trash2 } from 'lucide-react'
import type { CollectionOption } from '@/lib/collections-data'
import type { GeneratedCard } from '@/lib/generation/types'
import { saveReviewedCardsAction, discardGeneratedCardsAction, type SaveReviewSummary } from '@/app/(app)/upload/actions'
import { DestinationPicker, type DestinationValue } from '@/components/upload/DestinationPicker'
import { Alert } from '@/components/ui/Alert'

// The real Stage 3 review screen — editable frente/verso, discard one or all, then the same
// DestinationPicker/save flow the CSV import uses. GeneratedCardsPreview stays read-only on
// purpose (see its own comment) and keeps serving the debug tools.
export function ReviewGeneratedCards({
  materialId,
  cards: initialCards,
  collections,
  onDiscardedAll,
  onGenerateMore,
}: {
  materialId: string
  cards: GeneratedCard[]
  collections: CollectionOption[]
  onDiscardedAll: (materialIdToRefresh: string | null) => void
  onGenerateMore: () => void
}) {
  const router = useRouter()
  const [cards, setCards] = useState(initialCards)
  const [destination, setDestination] = useState<DestinationValue>({ type: 'none' })
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SaveReviewSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateCard(index: number, field: 'frente' | 'verso', value: string) {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function discardOne(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDiscardAll() {
    setError(null)
    startTransition(async () => {
      const result = await discardGeneratedCardsAction(materialId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onDiscardedAll(result.materialIdToRefresh)
    })
  }

  function handleSave() {
    setError(null)

    if (cards.length === 0) {
      setError('Não há cards para salvar.')
      return
    }
    if (destination.type === 'new' && !destination.name.trim()) {
      setError('Informe um nome para a nova coleção.')
      return
    }
    if (cards.some((c) => !c.frente.trim() || !c.verso.trim())) {
      setError('Preencha a frente e o verso de todos os cards antes de salvar.')
      return
    }

    startTransition(async () => {
      const result = await saveReviewedCardsAction(materialId, cards, destination)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSummary(result.summary)
      router.refresh()
    })
  }

  if (summary) {
    return <SavedSummaryView summary={summary} onGenerateMore={onGenerateMore} />
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[12px]" style={{ color: 'var(--good)' }}>
          {cards.length} card{cards.length === 1 ? '' : 's'} gerado{cards.length === 1 ? '' : 's'} · edite antes de salvar
        </div>
        <button
          type="button"
          onClick={handleDiscardAll}
          disabled={isPending}
          className="text-[11.5px] font-semibold disabled:opacity-60"
          style={{ color: 'var(--bad)' }}
        >
          Descartar todos
        </button>
      </div>

      <div className="flex flex-col gap-2" style={{ marginTop: 10, maxHeight: 420, overflowY: 'auto' }}>
        {cards.map((card, i) => (
          <div key={i} className="rounded-[13px]" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span className="text-[10.5px] font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}>
                Frente
              </span>
              <button type="button" onClick={() => discardOne(i)} aria-label="Descartar card" style={{ color: 'var(--muted)' }}>
                <Trash2 size={15} />
              </button>
            </div>
            <textarea
              value={card.frente}
              onChange={(e) => updateCard(i, 'frente', e.target.value)}
              rows={2}
              className="w-full text-[13.5px] font-semibold rounded-[9px]"
              style={{ padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'vertical' }}
            />
            <div className="text-[10.5px] font-bold uppercase" style={{ margin: '8px 0 6px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Verso
            </div>
            <textarea
              value={card.verso}
              onChange={(e) => updateCard(i, 'verso', e.target.value)}
              rows={4}
              className="w-full text-[12.5px] rounded-[9px]"
              style={{ padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'vertical' }}
            />
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-[12.5px] text-center" style={{ marginTop: 14, padding: '14px 0', color: 'var(--muted)' }}>
          Todos os cards foram descartados individualmente. Use &quot;Descartar todos&quot; acima para recomeçar.
        </div>
      )}

      <DestinationPicker collections={collections} value={destination} onChange={setDestination} />

      {error && <Alert style={{ marginTop: 12 }}>{error}</Alert>}

      <button
        onClick={handleSave}
        disabled={isPending || cards.length === 0}
        className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15.5px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ marginTop: 20, padding: 15, color: 'var(--on-accent)', background: 'var(--accent)', boxShadow: '0 8px 20px var(--accent-soft)' }}
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={2} />}
        {isPending ? 'Salvando...' : `Salvar ${cards.length} card${cards.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}

function SavedSummaryView({ summary, onGenerateMore }: { summary: SaveReviewSummary; onGenerateMore: () => void }) {
  return (
    <div className="rounded-2xl" style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <div
        className="flex items-center justify-center rounded-2xl mx-auto"
        style={{ width: 52, height: 52, marginBottom: 14, background: 'var(--good-soft)', color: 'var(--good)' }}
      >
        <Check size={26} strokeWidth={2.2} />
      </div>
      <div className="text-center text-[17px] font-bold">
        {summary.savedCount} card{summary.savedCount === 1 ? '' : 's'} salvo{summary.savedCount === 1 ? '' : 's'}
      </div>

      {summary.warning && <Alert style={{ marginTop: 14 }}>{summary.warning}</Alert>}

      {summary.collectionName && !summary.warning && (
        <div className="text-[13px] text-center" style={{ marginTop: 12, color: 'var(--muted)' }}>
          Adicionados à coleção <b style={{ color: 'var(--text)' }}>{summary.collectionName}</b>.
        </div>
      )}

      <div className="flex flex-col gap-2" style={{ marginTop: 20 }}>
        {summary.collectionId && (
          <Link
            href={`/collection/${summary.collectionId}`}
            className="text-center rounded-2xl text-[14.5px] font-semibold"
            style={{ padding: 14, background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Ver coleção
          </Link>
        )}
        <Link
          href="/colecoes"
          className="text-center rounded-2xl text-[14.5px] font-semibold"
          style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          Ver todas as coleções
        </Link>
        <button onClick={onGenerateMore} className="text-center rounded-2xl text-[13.5px] font-semibold" style={{ padding: 12, color: 'var(--muted)' }}>
          Gerar mais flashcards
        </button>
      </div>
    </div>
  )
}
