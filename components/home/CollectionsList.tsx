import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { CollectionSummary } from '@/lib/home-data'

export function CollectionsList({ collections }: { collections: CollectionSummary[] }) {
  return (
    <div>
      <div className="flex justify-between items-baseline" style={{ margin: '26px 0 12px' }}>
        <h2 className="text-[17px] font-bold" style={{ letterSpacing: '-0.01em' }}>
          Suas coleções
        </h2>
        {collections.length > 0 && (
          <Link href="/colecoes" className="text-[12.5px] font-semibold" style={{ color: 'var(--accent-strong)' }}>
            Ver todas
          </Link>
        )}
      </div>

      {collections.length === 0 ? (
        <div
          className="rounded-[16px] text-center"
          style={{
            padding: '28px 16px',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            color: 'var(--muted)',
            fontSize: 13.5,
          }}
        >
          Nenhuma coleção ainda. Gere flashcards a partir de um material para começar.
        </div>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collection/${col.id}`}
              className="flex items-center gap-[14px] rounded-[16px]"
              style={{
                padding: 13,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}
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
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'var(--surface-2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${col.accuracyPct ?? 0}%`, background: col.color }}
                    />
                  </div>
                  <span className="text-[11.5px] font-semibold flex-none" style={{ color: 'var(--muted)' }}>
                    {col.cardCount} card{col.cardCount === 1 ? '' : 's'}
                    {col.accuracyPct !== null ? ` · ${col.accuracyPct}%` : ''}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="flex-none" style={{ color: 'var(--muted)' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
