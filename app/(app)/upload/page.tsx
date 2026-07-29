import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionOptions } from '@/lib/collections-data'
import { AppShell } from '@/components/layout/AppShell'
import { BackHeader } from '@/components/layout/BackHeader'
import { UploadView } from '@/components/upload/UploadView'

// Server Actions inherit maxDuration from the page that invokes them, not from the action's own
// file — this page now triggers registerMaterialAction/generateFromMaterialAction/
// generateFromThemeAction via GenerateWithAI, all of which can run PDF vision batches or AI
// generation calls well past the platform default. 300 is the confirmed hard ceiling on the
// Vercel Hobby plan (see CLAUDE.md "Limite de duração de função serverless").
export const maxDuration = 300

export default async function UploadPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const collections = await getCollectionOptions(supabase, user.id)

  return (
    <AppShell header={<BackHeader title="Novo material" backHref="/home" />}>
      <UploadView collections={collections} userId={user.id} />
    </AppShell>
  )
}
