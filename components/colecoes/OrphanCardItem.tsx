'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, Trash2 } from 'lucide-react'
import type { CollectionOption, UnsortedCard } from '@/lib/collections-data'
import { moveOrphanCardAction, removeOrphanCardAction } from '@/app/(app)/colecoes/nao-organizados/actions'
import { DestinationPicker, type DestinationValue } from '@/components/upload/DestinationPicker'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'

// Three actions per orphan card (CLAUDE.md item 9): (1) one-tap move via the AI suggestion chip,
// (2) manual DestinationPicker for anything else, (3) delete. The suggestion is a convenience
// shortcut, never the only way to decide — (2) and (3) work identically whether or not a
// suggestion exists.
export function OrphanCardItem({
  card,
  collections,
  suggestion,
  onMoved,
  onRemoved,
}: {
  card: UnsortedCard
  collections: CollectionOption[]
  suggestion: CollectionOption | null
  onMoved: (flashcardId: string, collectionId: string | null, collectionName: string | null) => void
  onRemoved: (flashcardId: string) => void
}) {
  const [isChoosing, setIsChoosing] = useState(false)
  const [destination, setDestination] = useState<DestinationValue>({ type: 'none' })
  const [isMoving, setIsMoving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function move(value: DestinationValue) {
    setError(null)
    if (value.type === 'new' && !value.name.trim()) {
      setError('Informe um nome para a nova coleção.')
      return
    }

    setIsMoving(true)
    const result = await moveOrphanCardAction(card.id, value)
    setIsMoving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    onMoved(card.id, result.collectionId, result.collectionName)
  }

  async function handleRemove() {
    setIsRemoving(true)
    const result = await removeOrphanCardAction(card.id)
    setIsRemoving(false)

    if (!result.ok) {
      setConfirmOpen(false)
      setError(result.error)
      return
    }

    onRemoved(card.id)
  }

  function closeConfirm() {
    if (isRemoving) return
    setConfirmOpen(false)
  }

  const isBusy = isMoving || isRemoving

  return (
    <div className="rounded-2xl" style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <div className="text-[13.5px] font-semibold" style={{ lineHeight: 1.4 }}>
        {card.frente}
      </div>
      <div className="text-[12px] mt-1" style={{ color: 'var(--muted)', lineHeight: 1.45 }}>
        {card.verso}
      </div>

      <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
        {suggestion && (
          <button
            onClick={() => move({ type: 'existing', collectionId: suggestion.id })}
            disabled={isBusy}
            className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold disabled:opacity-60"
            style={{ padding: '8px 13px', background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
          >
            {isMoving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={2.2} />}
            Mover para &quot;{suggestion.nome}&quot;
          </button>
        )}

        <button
          onClick={() => setIsChoosing((v) => !v)}
          disabled={isBusy}
          className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold disabled:opacity-60"
          style={{ padding: '8px 13px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          Escolher coleção
          {isChoosing ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isBusy}
          className="inline-flex items-center gap-[6px] rounded-full text-[12px] font-semibold disabled:opacity-60"
          style={{ padding: '8px 13px', background: 'var(--bad-soft)', color: 'var(--bad)' }}
        >
          <Trash2 size={13} strokeWidth={2.2} />
          Remover
        </button>
      </div>

      {isChoosing && (
        <div>
          <DestinationPicker collections={collections} value={destination} onChange={setDestination} />
          <button
            onClick={() => move(destination)}
            disabled={isMoving}
            className="flex items-center justify-center gap-2 w-full rounded-2xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ marginTop: 14, padding: 13, background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {isMoving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.2} />}
            {isMoving ? 'Movendo...' : 'Mover card'}
          </button>
        </div>
      )}

      {error && <Alert style={{ marginTop: 12 }}>{error}</Alert>}

      <Modal open={confirmOpen} onClose={closeConfirm}>
        <div className="text-[15px] font-bold mb-2">Remover este card?</div>
        <p className="text-[13px]" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          O flashcard e todo o histórico de respostas dele serão apagados permanentemente. Essa ação não pode ser desfeita.
        </p>
        <div className="flex gap-[9px] mt-4">
          <button
            type="button"
            onClick={closeConfirm}
            disabled={isRemoving}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--bad)', color: '#fff' }}
          >
            {isRemoving ? 'Removendo...' : 'Remover definitivamente'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
