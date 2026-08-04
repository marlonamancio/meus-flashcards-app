import Link from 'next/link'
import type { CollectionSummary } from '@/lib/home-data'
import { withChildAggregates } from '@/lib/collection-progress'
import { CollectionListItem } from '@/components/collections/CollectionListItem'

export function CollectionsList({ collections }: { collections: CollectionSummary[] }) {
  const withAggregates = withChildAggregates(collections)

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
          {withAggregates.map((col) => (
            <CollectionListItem key={col.id} collection={col} showBar />
          ))}
        </div>
      )}
    </div>
  )
}
