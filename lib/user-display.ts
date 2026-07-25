import type { User } from '@supabase/supabase-js'
import { getAvatarPalette, type AvatarPalette } from '@/lib/palette'

// Contas criadas antes do cadastro público (manualmente via Supabase Dashboard) podem não ter
// user_metadata.name — sem usar a parte local do e-mail como nome, que não é um nome de exibição
// de verdade.
export function getDisplayFirstName(user: User): string | null {
  return (user.user_metadata?.name as string | undefined)?.split(' ')[0] ?? null
}

// Full value the user set in Perfil (unlike getDisplayFirstName, used by the Home greeting).
export function getDisplayName(user: User): string | null {
  return (user.user_metadata?.name as string | undefined) ?? null
}

export function getUserAvatarPalette(user: User): AvatarPalette {
  return getAvatarPalette(user.user_metadata?.avatarColor as string | undefined)
}
