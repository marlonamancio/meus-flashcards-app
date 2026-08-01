'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import type { CollectionOption, UnsortedCard } from '@/lib/collections-data'
import { suggestCollectionsAction, applySuggestedMovesAction } from '@/app/(app)/colecoes/nao-organizados/actions'
import { OrphanCardItem } from '@/components/colecoes/OrphanCardItem'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'

export function NaoOrganizadosView({
  initialCards,
  initialCollections,
}: {
  initialCards: UnsortedCard[]
  initialCollections: CollectionOption[]
}) {
  const [cards, setCards] = useState(initialCards)
  const [collections, setCollections] = useState(initialCollections)
  const [suggestions, setSuggestions] = useState<Map<string, string | null>>(new Map())
  const [suggestionsLoading, setSuggestionsLoading] = useState(initialCards.length > 0 && initialCollections.length > 0)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applyFailures, setApplyFailures] = useState<{ frente: string; error: string }[] | null>(null)

  useEffect(() => {
    if (initialCards.length === 0 || initialCollections.length === 0) return

    let cancelled = false
    suggestCollectionsAction().then((result) => {
      if (cancelled) return
      setSuggestionsLoading(false)
      if (!result.ok) {
        setSuggestionsError(result.error)
        return
      }
      setSuggestions(new Map(result.suggestions.map((s) => [s.flashcardId, s.collectionId])))
    })

    return () => {
      cancelled = true
    }
    // Runs once on mount — this screen is always entered fresh (server-fetched initialCards),
    // no need to re-suggest mid-session as cards get moved/removed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleMoved(flashcardId: string, collectionId: string | null, collectionName: string | null) {
    setCards((prev) => prev.filter((c) => c.id !== flashcardId))
    if (collectionId && collectionName && !collections.some((c) => c.id === collectionId)) {
      setCollections((prev) => [...prev, { id: collectionId, nome: collectionName }].sort((a, b) => a.nome.localeCompare(b.nome)))
    }
  }

  function handleRemoved(flashcardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== flashcardId))
  }

  function closeApplyModal() {
    if (isApplying) return
    setApplyModalOpen(false)
  }

  const cardsWithSuggestion = cards.filter((c) => (suggestions.get(c.id) ?? null) !== null)

  async function handleApplyAll() {
    const moves = cardsWithSuggestion.map((c) => ({ flashcardId: c.id, collectionId: suggestions.get(c.id) as string }))
    if (moves.length === 0) return

    setIsApplying(true)
    const result = await applySuggestedMovesAction(moves)
    setIsApplying(false)
    setApplyModalOpen(false)

    // Partial failure never undoes or hides the moves that already succeeded — only the cards
    // that actually moved leave the list; failed ones stay put with their suggestion chip intact
    // so the user can retry (CLAUDE.md item 9, "Aplicar todas as sugestões").
    const movedIds = new Set(result.moved.map((m) => m.flashcardId))
    setCards((prev) => prev.filter((c) => !movedIds.has(c.id)))

    if (result.failed.length > 0) {
      setApplyFailures(
        result.failed.map((f) => ({
          frente: cards.find((c) => c.id === f.flashcardId)?.frente ?? 'Card',
          error: f.error,
        }))
      )
    } else {
      setApplyFailures(null)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div className="text-[13px]" style={{ marginBottom: 14, color: 'var(--muted)' }}>
        {cards.length} card{cards.length === 1 ? '' : 's'} sem coleção
      </div>

      {suggestionsLoading && (
        <Alert
          tone="accent"
          icon={<Loader2 size={16} strokeWidth={2.2} className="animate-spin" style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-strong)' }} />}
          style={{ marginBottom: 14 }}
        >
          Buscando sugestões de coleção com IA...
        </Alert>
      )}

      {suggestionsError && <Alert style={{ marginBottom: 14 }}>{suggestionsError} Você ainda pode mover os cards manualmente.</Alert>}

      {!suggestionsLoading && cardsWithSuggestion.length > 0 && (
        <button
          onClick={() => setApplyModalOpen(true)}
          className="flex items-center justify-center gap-2 w-full rounded-2xl text-[14px] font-semibold"
          style={{ marginBottom: 14, padding: 13, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
        >
          <Sparkles size={16} strokeWidth={2.2} />
          Aplicar todas as sugestões ({cardsWithSuggestion.length})
        </button>
      )}

      {applyFailures && (
        <Alert style={{ marginBottom: 14, alignItems: 'flex-start' }}>
          <div className="font-bold mb-1.5">
            Não foi possível mover {applyFailures.length} card{applyFailures.length === 1 ? '' : 's'}
          </div>
          <ul style={{ lineHeight: 1.6 }}>
            {applyFailures.map((f, i) => (
              <li key={i}>
                {f.frente} — {f.error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {cards.length === 0 ? (
        <div
          className="rounded-2xl text-center"
          style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          Nenhum card sem coleção.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((card) => {
            const suggestedId = suggestions.get(card.id) ?? null
            const suggestedCollection = suggestedId ? (collections.find((c) => c.id === suggestedId) ?? null) : null
            return (
              <OrphanCardItem
                key={card.id}
                card={card}
                collections={collections}
                suggestion={suggestedCollection}
                onMoved={handleMoved}
                onRemoved={handleRemoved}
              />
            )
          })}
        </div>
      )}

      <Modal open={applyModalOpen} onClose={closeApplyModal}>
        <div className="text-[15px] font-bold mb-2">Aplicar sugestões?</div>
        <p className="text-[13px]" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          Mover {cardsWithSuggestion.length} card{cardsWithSuggestion.length === 1 ? '' : 's'} para suas coleções sugeridas?
        </p>
        <div className="flex gap-[9px] mt-4">
          <button
            type="button"
            onClick={closeApplyModal}
            disabled={isApplying}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleApplyAll}
            disabled={isApplying}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {isApplying ? 'Movendo...' : 'Mover cards'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
