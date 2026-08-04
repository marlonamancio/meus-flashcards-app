import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getCollectionProgressDisplay, type CollectionWithAggregate } from '@/lib/collection-progress'

// Single row markup reused by Home ("Suas coleções"), Coleções (lista completa, flat e agrupada),
// e a lista de subcoleções na tela de detalhe — CLAUDE.md item 5 explicitly calls for one shared
// component here instead of three near-identical hand-rolled rows (which is exactly how the mãe/
// vazia bug happened: each screen had its own copy of the "bar vs text vs dash" ternary, and only
// one of the three got updated when sub-coleções shipped). `showBar` is the one real visual
// difference across screens (Home has a mini progress bar, Coleções/subcoleções are text-only) —
// everything else, including the mãe/vazia decision, is identical everywhere.
export function CollectionListItem({
  collection,
  indent,
  showBar = false,
}: {
  collection: CollectionWithAggregate
  indent?: boolean
  showBar?: boolean
}) {
  const display = getCollectionProgressDisplay(collection)

  return (
    <Link
      href={`/collection/${collection.id}`}
      className="flex items-center gap-[14px] rounded-[16px]"
      style={{ padding: 13, marginLeft: indent ? 18 : 0, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
    >
      <div
        className="flex-none flex items-center justify-center rounded-[12px] text-[15px] font-bold"
        style={{ width: 44, height: 44, background: collection.soft, color: collection.color }}
      >
        {collection.short}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-semibold truncate" style={{ letterSpacing: '-0.01em' }}>
          {collection.nome}
        </div>

        {display.kind === 'parent' && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {display.cardCount} card{display.cardCount === 1 ? '' : 's'} · {display.childCount} subcoleç{display.childCount === 1 ? 'ão' : 'ões'}
          </div>
        )}

        {display.kind === 'leaf' && (display.cardCount === 0 || !showBar) && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {display.cardCount} card{display.cardCount === 1 ? '' : 's'} · {display.accuracyPct !== null ? `${display.accuracyPct}%` : '—'}
          </div>
        )}

        {display.kind === 'leaf' && display.cardCount > 0 && showBar && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full" style={{ width: `${display.accuracyPct ?? 0}%`, background: collection.color }} />
            </div>
            <span className="text-[11.5px] font-semibold flex-none" style={{ color: 'var(--muted)' }}>
              {display.cardCount} card{display.cardCount === 1 ? '' : 's'}
              {display.accuracyPct !== null ? ` · ${display.accuracyPct}%` : ''}
            </span>
          </div>
        )}
      </div>
      <ChevronRight size={18} className="flex-none" style={{ color: 'var(--muted)' }} />
    </Link>
  )
}
