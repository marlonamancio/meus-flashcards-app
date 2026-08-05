'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Loader2, Pencil, Search, X } from 'lucide-react'
import type { CollectionDetail, CollectionOption } from '@/lib/collections-data'
import { updateFlashcardAction } from '@/app/(app)/collection/[id]/navegar/actions'
import { DestinationPicker, type DestinationValue } from '@/components/upload/DestinationPicker'
import { Alert } from '@/components/ui/Alert'
import { IconButton } from '@/components/ui/IconButton'
import { useDebouncedValue } from '@/lib/use-debounced-value'

// Read-only browsing of a collection's cards — flip to see the answer, step forward/back with
// buttons (no swipe, same convention as the rest of the app). Deliberately isolated from the
// study flow: no study-recording server actions imported here, so there is no way for this
// screen to ever write to flashcard_responses or flashcard_schedule, touch due_date, streaks,
// the daily goal, or badges. Editing (below) is the one write path this screen has, and it's
// scoped to flashcards.frente/verso and collection_flashcards only — see CLAUDE.md item 11 and
// USER_STORIES.md US34.
export function BrowseSession({
  collection,
  collections,
  initialIndex,
}: {
  collection: CollectionDetail
  collections: CollectionOption[]
  initialIndex: number
}) {
  const router = useRouter()
  const [cards, setCards] = useState(collection.cards)
  const [index, setIndex] = useState(initialIndex)
  const [flipped, setFlipped] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftFrente, setDraftFrente] = useState('')
  const [draftVerso, setDraftVerso] = useState('')
  const [draftDestination, setDraftDestination] = useState<DestinationValue>({ type: 'existing', collectionId: collection.id })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Contextual search (CLAUDE.md item 12, "busca CONTEXTUAL local") — filters the collection's
  // cards array that's ALREADY in memory here (needed for browsing regardless), never hits the
  // server. Debounce is light (visual smoothness only, not a cost concern like the global search's
  // 350ms) since filtering an in-memory array is essentially free.
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 120)

  const card = cards[index]
  const isFirst = index === 0
  const isLast = index === cards.length - 1

  const searchResults = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase()
    if (!q) return []
    return cards.map((c, i) => ({ card: c, index: i })).filter(({ card: c }) => c.frente.toLowerCase().includes(q) || c.verso.toLowerCase().includes(q))
  }, [cards, debouncedSearchQuery])

  function goTo(nextIndex: number) {
    setIndex(nextIndex)
    setFlipped(false)
  }

  function openSearch() {
    setIsSearching(true)
  }

  function closeSearch() {
    setIsSearching(false)
    setSearchQuery('')
  }

  function selectSearchResult(targetIndex: number) {
    goTo(targetIndex)
    closeSearch()
  }

  function startEditing() {
    setDraftFrente(card.frente)
    setDraftVerso(card.verso)
    // Pre-selected on the collection this session was opened from — leaving it untouched means
    // "no change", handled as a no-op by the action.
    setDraftDestination({ type: 'existing', collectionId: collection.id })
    setError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    if (!draftFrente.trim() || !draftVerso.trim()) {
      setError('Preencha a frente e o verso do card.')
      return
    }
    if (draftDestination.type === 'new' && !draftDestination.name.trim()) {
      setError('Informe um nome para a nova coleção.')
      return
    }

    setIsSaving(true)
    setError(null)
    const result = await updateFlashcardAction(card.id, draftFrente, draftVerso, collection.id, draftDestination)
    setIsSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    if (result.movedAway) {
      // The card no longer belongs to the collection this browse session was opened from, so it
      // no longer fits this queue — drop it and move on instead of bouncing back to the
      // collection list every time. This lets someone reorganizing several misplaced cards in a
      // row keep browsing/editing without getting kicked out after each one; only when nothing's
      // left to browse does it fall back to the collection page.
      const remaining = cards.filter((c) => c.id !== card.id)

      // router.replace, not push, for both exits below: the URL's [cardId] must never keep
      // pointing at a card that just left this collection. The bug this fixes: staying on the
      // old (now-invalid) /navegar/[cardId] URL and calling router.refresh() re-runs the page's
      // Server Component with that stale id — getCollectionDetail's `cards` no longer include
      // it, `findIndex` returns -1, and the page 404s. push (instead of replace) had the same
      // problem one step removed: the dead URL stayed reachable via the browser's back button.
      if (remaining.length === 0) {
        router.replace(`/collection/${collection.id}`)
        return
      }

      const nextIndex = Math.min(index, remaining.length - 1)
      const nextCard = remaining[nextIndex]

      setCards(remaining)
      setIndex(nextIndex)
      setFlipped(false)
      setIsEditing(false)
      router.replace(`/collection/${collection.id}/navegar/${nextCard.id}`)
      return
    }

    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, frente: draftFrente.trim(), verso: draftVerso.trim() } : c)))
    setIsEditing(false)
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3" style={{ padding: '10px 20px 14px', flex: 'none' }}>
        {isSearching ? (
          <>
            <button
              onClick={closeSearch}
              aria-label="Fechar busca"
              className="flex items-center justify-center rounded-[11px] flex-none"
              style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <X size={19} strokeWidth={2.2} />
            </button>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nesta coleção"
              className="flex-1 min-w-0 text-sm rounded-[11px]"
              style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </>
        ) : (
          <>
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
            {!isEditing && (
              <IconButton onClick={openSearch} aria-label="Buscar nesta coleção">
                <Search size={17} strokeWidth={2.2} />
              </IconButton>
            )}
            {!isEditing && (
              <button
                onClick={startEditing}
                aria-label="Editar card"
                className="flex items-center justify-center rounded-[11px] flex-none"
                style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Pencil size={17} strokeWidth={2.2} />
              </button>
            )}
            <span className="text-xs font-bold flex-none" style={{ color: 'var(--muted)' }}>
              {index + 1} / {cards.length}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col" style={{ padding: '8px 22px 20px', minHeight: 0 }}>
        {isSearching ? (
          <div className="flex-1" style={{ minHeight: 0, overflowY: 'auto' }}>
            {searchQuery.trim() === '' ? (
              <div className="text-center" style={{ padding: '32px 16px', color: 'var(--muted)', fontSize: 13.5 }}>
                Digite para buscar nesta coleção.
              </div>
            ) : searchResults.length === 0 ? (
              <div
                className="rounded-2xl text-center"
                style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
              >
                Nenhum card encontrado.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {searchResults.map(({ card: c, index: i }) => (
                  <button
                    key={c.id}
                    onClick={() => selectSearchResult(i)}
                    className="flex flex-col items-start text-left w-full rounded-[14px]"
                    style={{ padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <div className="text-[13.5px] font-semibold truncate w-full" style={{ lineHeight: 1.35 }}>
                      {c.frente}
                    </div>
                    <div className="text-[11.5px] mt-[3px] truncate w-full" style={{ color: 'var(--muted)' }}>
                      {c.verso}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : isEditing ? (
          <>
            <div className="flex-1 flex flex-col gap-3" style={{ minHeight: 0, overflowY: 'auto' }}>
              <div
                className="rounded-[24px]"
                style={{ padding: '20px 22px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
              >
                <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: '0.08em', color: collection.color }}>
                  Pergunta
                </span>
                <textarea
                  value={draftFrente}
                  onChange={(e) => setDraftFrente(e.target.value)}
                  rows={3}
                  className="w-full text-[15px] font-semibold rounded-[11px]"
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                className="rounded-[24px]"
                style={{ padding: '20px 22px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
              >
                <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: '0.08em', color: 'var(--accent)' }}>
                  Resposta
                </span>
                <textarea
                  value={draftVerso}
                  onChange={(e) => setDraftVerso(e.target.value)}
                  rows={4}
                  className="w-full text-[14px] rounded-[11px]"
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <DestinationPicker label="Coleção deste card" collections={collections} value={draftDestination} onChange={setDraftDestination} />

              {error && <Alert>{error}</Alert>}
            </div>

            <div className="flex gap-[11px]" style={{ marginTop: 18, flex: 'none' }}>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold disabled:opacity-40"
                style={{ padding: 16, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold disabled:opacity-60"
                style={{ padding: 16, background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={2.3} />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
