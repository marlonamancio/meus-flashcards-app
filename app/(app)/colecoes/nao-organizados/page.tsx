import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getUnsortedCards, getCollectionOptions } from '@/lib/collections-data'
import { AppShell } from '@/components/layout/AppShell'
import { BackHeader } from '@/components/layout/BackHeader'
import { NaoOrganizadosView } from '@/components/colecoes/NaoOrganizadosView'

export default async function NaoOrganizadosPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const [cards, collections] = await Promise.all([getUnsortedCards(supabase, user.id), getCollectionOptions(supabase, user.id)])

  return (
    <AppShell header={<BackHeader title="Não organizados" backHref="/colecoes" />}>
      <NaoOrganizadosView initialCards={cards} initialCollections={collections} />
    </AppShell>
  )
}
