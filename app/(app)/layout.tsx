import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  await requireUser(supabase)

  return <>{children}</>
}
