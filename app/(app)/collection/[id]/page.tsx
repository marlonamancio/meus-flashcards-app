import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionOverview, getCollectionCardIds, getEligibleParentOptions } from '@/lib/collections-data'
import { getDueMap } from '@/lib/flashcard-schedule'
import { AppShell } from '@/components/layout/AppShell'
import { CollectionHeader } from '@/components/collection/CollectionHeader'
import { StudyEntryButton } from '@/components/collection/StudyEntryButton'
import { CollectionCardsList } from '@/components/collection/CollectionCardsList'
import { ChildCollectionsList } from '@/components/collection/ChildCollectionsList'

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireUser(supabase)

  // getDueMap only needs the collection's flashcard ids, not the full overview (metadata + first
  // page + accuracy) — fetching that id list separately lets it run in parallel with
  // getCollectionOverview instead of waiting for the whole thing to finish first (see CLAUDE.md
  // "Performance — paralelização de getDueMap"). eligibleParents (sub-coleções, CLAUDE.md item 4)
  // is independent of both and joins the same Promise.all for the same reason.
  const [collection, cardIds, eligibleParents] = await Promise.all([
    getCollectionOverview(supabase, user.id, id),
    getCollectionCardIds(supabase, user.id, id),
    getEligibleParentOptions(supabase, user.id, id),
  ])
  if (!collection) notFound()

  // A coleção-mãe "pura" (só agrupa filhas, sem cards próprios) não tem o que estudar/listar
  // diretamente — ver CLAUDE.md item 4 e a explicação de produto no PR: em vez da lista de cards
  // vazia, mostra a lista de subcoleções com contagem agregada. Uma mãe "híbrida" (tem cards
  // próprios E filhas) mantém a seção de Cards normal, só ganha a seção de Subcoleções também.
  const hasChildren = collection.children.length > 0
  const isPureParent = hasChildren && collection.cardCount === 0
  const totalCardCount = collection.cardCount + collection.children.reduce((sum, c) => sum + c.cardCount, 0)

  // cardIds is the WHOLE collection, not just the current page — hasDueCards must reflect due
  // cards anywhere in the collection, not only among the cards already loaded on screen.
  const dueMap = await getDueMap(supabase, user.id, cardIds)
  const hasDueCards = dueMap.size > 0

  const stats = [
    { value: collection.accuracyPct !== null ? `${collection.accuracyPct}%` : '—', label: 'taxa de acerto', color: 'var(--good)' },
    { value: collection.errorPct !== null ? `${collection.errorPct}%` : '—', label: 'taxa de erro', color: 'var(--bad)' },
    { value: String(collection.reviewCount), label: 'revisões' },
  ]

  return (
    <AppShell header={<CollectionHeader collection={collection} eligibleParents={eligibleParents} />}>
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
            {hasChildren ? totalCardCount : collection.cardCount} card{(hasChildren ? totalCardCount : collection.cardCount) === 1 ? '' : 's'}
            {hasChildren ? ` · ${collection.children.length} subcoleç${collection.children.length === 1 ? 'ão' : 'ões'}` : ''}
          </div>
          {collection.parentNome && (
            <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
              Agrupada em {collection.parentNome}
            </div>
          )}
        </div>
      </div>

      {collection.cardCount > 0 && <StudyEntryButton collectionId={collection.id} hasDueCards={hasDueCards} />}

      {!isPureParent && (
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
      )}

      {hasChildren && (
        <>
          <div className="flex justify-between items-baseline" style={{ margin: '22px 0 11px' }}>
            <h2 className="text-[14.5px] font-bold">Subcoleções</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{collection.children.length}</span>
          </div>
          <ChildCollectionsList items={collection.children} />
        </>
      )}

      {!isPureParent && (
        <>
          <div className="flex justify-between items-baseline" style={{ margin: '22px 0 11px' }}>
            <h2 className="text-[14.5px] font-bold">Cards</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{collection.cardCount}</span>
          </div>
          <CollectionCardsList collectionId={collection.id} initialCards={collection.cards} initialNextCursor={collection.nextCursor} />
        </>
      )}
    </AppShell>
  )
}
