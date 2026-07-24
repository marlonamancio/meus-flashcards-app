import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely via SUPABASE_SECRET_KEY. Only import this from
// Server Actions/Route Handlers, and only after the caller's identity has already been verified
// through the normal session-based client (never trust a client-supplied user id here). The key
// itself can't leak into the browser bundle since it isn't NEXT_PUBLIC_-prefixed, but the
// privilege it grants (e.g. auth.admin.*) is enough reason to keep this out of client code too.
export function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
