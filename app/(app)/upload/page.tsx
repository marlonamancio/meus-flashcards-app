import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionOptions } from '@/lib/collections-data'
import { AppShell } from '@/components/layout/AppShell'
import { BackHeader } from '@/components/layout/BackHeader'
import { UploadView } from '@/components/upload/UploadView'

export default async function UploadPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collections = await getCollectionOptions(supabase, user.id)

  return (
    <AppShell header={<BackHeader title="Novo material" backHref="/home" />}>
      <UploadView collections={collections} />
    </AppShell>
  )
}
