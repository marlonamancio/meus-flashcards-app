import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { CollectionSummary } from '@/lib/home-data'

// Sub-coleções (CLAUDE.md item 4) — lista das filhas na tela de detalhe de uma coleção-mãe. Cada
// filha estuda isoladamente (sem agregação SM-2), então esta lista é puramente de navegação: toca
// numa filha para abrir a própria tela de detalhe dela, mesmo padrão de linha usado em
// ColecoesView/CollectionsList.
export function ChildCollectionsList({ items }: { items: CollectionSummary[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((col) => (
        <Link
          key={col.id}
          href={`/collection/${col.id}`}
          className="flex items-center gap-[14px] rounded-[16px]"
          style={{ padding: 13, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <div
            className="flex-none flex items-center justify-center rounded-[12px] text-[15px] font-bold"
            style={{ width: 44, height: 44, background: col.soft, color: col.color }}
          >
            {col.short}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-semibold truncate" style={{ letterSpacing: '-0.01em' }}>
              {col.nome}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {col.cardCount} card{col.cardCount === 1 ? '' : 's'} · {col.accuracyPct !== null ? `${col.accuracyPct}%` : '—'}
            </div>
          </div>
          <ChevronRight size={18} className="flex-none" style={{ color: 'var(--muted)' }} />
        </Link>
      ))}
    </div>
  )
}
