import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getDisplayFirstName } from '@/lib/user-display'
import { getCollections } from '@/lib/home-data'
import { getUnsortedCount } from '@/lib/collections-data'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { HeaderBrand } from '@/components/layout/HeaderBrand'
import { ColecoesView } from '@/components/colecoes/ColecoesView'

export default async function ColecoesPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const displayName = getDisplayFirstName(user)
  const [collections, unsortedCount] = await Promise.all([
    getCollections(supabase, user.id),
    getUnsortedCount(supabase, user.id),
  ])

  return (
    <AppShell header={<Header displayName={displayName}><HeaderBrand /></Header>}>
      <ColecoesView collections={collections} unsortedCount={unsortedCount} userId={user.id} />
    </AppShell>
  )
}
