'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { createAdminClient } from '@/lib/supabase/admin'

const MATERIALS_BUCKET = 'materiais'

export type DeleteAccountResult = { ok: false; error: string }

// No parameters on purpose — the user id to delete comes only from the verified session
// (requireUser), never from client input, so this action can never be tricked into deleting
// a different account.
export async function deleteAccountAction(): Promise<DeleteAccountResult | void> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  // Storage objects have no FK to auth.users, so the ON DELETE CASCADE below (table rows only)
  // never reaches them — without this, every file the user ever uploaded to the "materiais"
  // bucket stays orphaned there forever, even after the account and all references to it are
  // gone. Must run while the session is still valid, since Storage RLS
  // (013_storage_materiais_policies.sql) only lets a user list/remove their own folder.
  const { data: files } = await supabase.storage.from(MATERIALS_BUCKET).list(user.id)
  if (files && files.length > 0) {
    await supabase.storage.from(MATERIALS_BUCKET).remove(files.map((f) => `${user.id}/${f.name}`))
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    return { ok: false, error: 'Não foi possível excluir a conta. Tente novamente.' }
  }

  // Every table's user_id FK to auth.users has ON DELETE CASCADE (verified against migrations
  // 001-008), so the user row above is the only thing that needed deleting explicitly —
  // materials, flashcards, collections, collection_flashcards, flashcard_responses,
  // user_stats, daily_activity, and badges all cascade automatically.
  await supabase.auth.signOut()
  redirect('/conta-excluida')
}
