import Link from 'next/link'
import { Play } from 'lucide-react'

// No more resume/restart dialog: SM-2's due_date already tracks per-card state, so there's no
// "passagem em andamento" to ask about — either there are due cards to study, or there aren't
// (see CLAUDE.md item 6).
export function StudyEntryButton({ collectionId, hasDueCards }: { collectionId: string; hasDueCards: boolean }) {
  if (!hasDueCards) {
    return (
      <div
        className="text-center rounded-2xl text-[13.5px] font-semibold"
        style={{ marginTop: 16, padding: 15, background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
      >
        Nenhum card para revisar hoje, volte amanhã!
      </div>
    )
  }

  return (
    <Link
      href={`/collection/${collectionId}/estudar`}
      className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15px] font-semibold"
      style={{ marginTop: 16, padding: 15, color: 'var(--on-accent)', background: 'var(--accent)', boxShadow: '0 8px 20px var(--accent-soft)' }}
    >
      <Play size={18} fill="var(--on-accent)" strokeWidth={0} />
      Estudar esta coleção
    </Link>
  )
}
