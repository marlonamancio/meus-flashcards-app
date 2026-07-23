import { redirect } from 'next/navigation'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Distinguishes "not logged in" (redirect('/login'), the normal/expected case) from a real
// failure talking to Supabase (network error, outage) — the latter throws so it surfaces via
// the nearest error.tsx instead of silently behaving like an unauthenticated visitor.
export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(`Falha ao verificar sessão: ${error.message}`)
  }
  if (!user) {
    redirect('/login')
  }
  return user
}
