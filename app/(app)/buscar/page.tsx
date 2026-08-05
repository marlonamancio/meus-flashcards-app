import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { AppShell } from '@/components/layout/AppShell'
import { BackHeader } from '@/components/layout/BackHeader'
import { SearchView } from '@/components/buscar/SearchView'

export default async function BuscarPage() {
  const supabase = await createClient()
  await requireUser(supabase)

  return (
    <AppShell header={<BackHeader title="Buscar" backHref="/home" />}>
      <SearchView />
    </AppShell>
  )
}
