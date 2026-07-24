'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { isAvatarColorKey } from '@/lib/palette'
import { getPasswordHints, isPasswordValid } from '@/lib/password-policy'

const MIN_GOAL = 1
const MAX_GOAL = 200
const MAX_NAME_LENGTH = 60

export type UpdateDailyGoalResult = { ok: true; value: number } | { ok: false; error: string }

export async function updateDailyGoalAction(value: number): Promise<UpdateDailyGoalResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const clamped = Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(value)))

  const { error } = await supabase.from('user_stats').upsert({ user_id: user.id, meta_diaria_cards: clamped }, { onConflict: 'user_id' })

  if (error) {
    return { ok: false, error: 'Não foi possível salvar a meta diária. Tente novamente.' }
  }

  return { ok: true, value: clamped }
}

export type UpdateDisplayNameResult = { ok: true; name: string } | { ok: false; error: string }

export async function updateDisplayNameAction(name: string): Promise<UpdateDisplayNameResult> {
  const supabase = await createClient()
  await requireUser(supabase)

  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, error: 'O nome não pode ficar em branco.' }
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.` }
  }

  // updateUser({ data }) merges into user_metadata — it doesn't overwrite unrelated keys like
  // avatarColor.
  const { error } = await supabase.auth.updateUser({ data: { name: trimmed } })

  if (error) {
    return { ok: false, error: 'Não foi possível salvar o nome. Tente novamente.' }
  }

  return { ok: true, name: trimmed }
}

export type UpdateAvatarColorResult = { ok: true; key: string } | { ok: false; error: string }

export async function updateAvatarColorAction(key: string): Promise<UpdateAvatarColorResult> {
  const supabase = await createClient()
  await requireUser(supabase)

  if (!isAvatarColorKey(key)) {
    return { ok: false, error: 'Cor inválida.' }
  }

  const { error } = await supabase.auth.updateUser({ data: { avatarColor: key } })

  if (error) {
    return { ok: false, error: 'Não foi possível salvar a cor do avatar. Tente novamente.' }
  }

  return { ok: true, key }
}

export type UpdatePasswordResult = { ok: true } | { ok: false; error: string }

export async function updatePasswordAction(currentPassword: string, newPassword: string): Promise<UpdatePasswordResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  if (!isPasswordValid(getPasswordHints(newPassword))) {
    return { ok: false, error: 'A nova senha não atende aos requisitos de segurança.' }
  }
  if (!user.email) {
    return { ok: false, error: 'Não foi possível verificar sua conta. Tente novamente.' }
  }

  // supabase.auth.updateUser({ password }) only requires a valid session — it does not verify
  // the caller actually knows the CURRENT password. Since the form explicitly asks for it (and
  // an unattended/hijacked session could otherwise change the password without knowing it), we
  // verify it ourselves first via signInWithPassword — the standard technique for this, since
  // Supabase has no separate "verify password without signing in" endpoint. This re-issues the
  // same session on success, so it doesn't disrupt the current login.
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })

  if (verifyError) {
    return { ok: false, error: 'Senha atual incorreta.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

  if (updateError) {
    if (updateError.message.toLowerCase().includes('should be different')) {
      return { ok: false, error: 'A nova senha deve ser diferente da atual.' }
    }
    return { ok: false, error: 'A nova senha não atende à política de senha forte configurada. Tente novamente.' }
  }

  return { ok: true }
}
