import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { AppShell } from '@/components/layout/AppShell'
import { BackHeader } from '@/components/layout/BackHeader'
import { ExtractionDebug } from '@/components/upload/ExtractionDebug'

// Server Actions inherit maxDuration from the page that invokes them, not from the action's own
// file (Next.js docs: "set the maxDuration at the page level to change the default timeout of
// all Server Actions used on the page") — registerMaterialAction's extraction can run several
// vision batches in sequence (up to 4 at 25 pages/batch for a 100-page material), each plausibly
// 40-90s per CLAUDE.md's diagnosis, so the platform default is nowhere near enough. 300 is the
// confirmed hard ceiling on the Vercel Hobby plan (a deploy with 600 was rejected outright:
// "Serverless Functions must have a maxDuration between 1 and 300 for plan hobby") — see
// CLAUDE.md "Limite de duração de função serverless" for the residual risk this leaves for a
// worst-case dense 100-page material. Move this export to wherever Stage 2 ships the real
// "Enviar arquivo" flow once this debug page is retired.
export const maxDuration = 300

// Temporary route for Stage 1 (extração de conteúdo) — remove once Stage 2 (geração via IA)
// ships the real "Enviar arquivo" flow inside UploadView.
export default async function UploadDebugPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  return (
    <AppShell header={<BackHeader title="Debug de extração" backHref="/upload" />}>
      <ExtractionDebug userId={user.id} />
    </AppShell>
  )
}
