import type { User } from '@supabase/supabase-js'

// Contas são criadas manualmente via Supabase Dashboard (sem cadastro público na v1),
// então user_metadata.name normalmente não existe ainda — sem usar a parte local do
// e-mail como nome, que não é um nome de exibição de verdade.
export function getDisplayFirstName(user: User): string | null {
  return (user.user_metadata?.name as string | undefined)?.split(' ')[0] ?? null
}
