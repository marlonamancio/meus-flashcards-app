import type { CollectionSummary } from '@/lib/home-data'
import { withChildAggregates } from '@/lib/collection-progress'
import { CollectionListItem } from '@/components/collections/CollectionListItem'

// Sub-coleções (CLAUDE.md item 4) — lista das filhas na tela de detalhe de uma coleção-mãe. Cada
// filha estuda isoladamente (sem agregação SM-2), então esta lista é puramente de navegação: toca
// numa filha para abrir a própria tela de detalhe dela. Reaproveita o mesmo CollectionListItem
// usado em Home/Coleções (CLAUDE.md item 5) — uma filha nunca tem filhas (regra de um nível só),
// então withChildAggregates sempre resolve childCount 0 aqui, mas passar pela mesma função
// centralizada em vez de assumir isso manualmente é o que evita essa lista divergir de novo.
export function ChildCollectionsList({ items }: { items: CollectionSummary[] }) {
  const enriched = withChildAggregates(items)

  return (
    <div className="flex flex-col gap-2">
      {enriched.map((col) => (
        <CollectionListItem key={col.id} collection={col} />
      ))}
    </div>
  )
}
