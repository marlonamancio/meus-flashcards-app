import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionDetail } from '@/lib/collections-data'
import { AppShell } from '@/components/layout/AppShell'
import { CollectionHeader } from '@/components/collection/CollectionHeader'

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collection = await getCollectionDetail(supabase, user.id, id)
  if (!collection) notFound()

  const stats = [
    { value: collection.accuracyPct !== null ? `${collection.accuracyPct}%` : '—', label: 'taxa de acerto', color: 'var(--good)' },
    { value: collection.errorPct !== null ? `${collection.errorPct}%` : '—', label: 'taxa de erro', color: 'var(--bad)' },
    { value: String(collection.reviewCount), label: 'revisões' },
  ]

  return (
    <AppShell header={<CollectionHeader collection={collection} />}>
      <div className="flex items-center gap-[14px]" style={{ marginTop: 8 }}>
        <div
          className="flex-none flex items-center justify-center rounded-2xl text-[18px] font-bold"
          style={{ width: 52, height: 52, background: collection.soft, color: collection.color }}
        >
          {collection.short}
        </div>
        <div>
          <div className="text-[21px] font-bold" style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {collection.nome}
          </div>
          <div className="text-[12.5px] mt-[3px]" style={{ color: 'var(--muted)' }}>
            {collection.cardCount} card{collection.cardCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="flex gap-[9px]" style={{ marginTop: 18 }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 rounded-2xl"
            style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="text-[22px] font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-baseline" style={{ margin: '22px 0 11px' }}>
        <h2 className="text-[14.5px] font-bold">Cards</h2>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{collection.cardCount}</span>
      </div>
      <div
        className="rounded-2xl text-center"
        style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
      >
        Nenhum card nesta coleção ainda.
      </div>
    </AppShell>
  )
}
