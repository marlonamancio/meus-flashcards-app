export type PasswordHints = {
  length: boolean
  uppercase: boolean
  lowercase: boolean
  number: boolean
  symbol: boolean
}

// Mirrors the strong-password policy configured in Supabase Dashboard → Auth → Policies
// (6+ chars, upper/lower/number/symbol — reduced from 10-12 originally planned, see
// CLAUDE.md "Autenticação"). This client-side check is for immediate UI feedback only — the
// policy that actually protects the account is enforced server-side by Supabase.
export function getPasswordHints(password: string): PasswordHints {
  return {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

export function isPasswordValid(hints: PasswordHints): boolean {
  return Object.values(hints).every(Boolean)
}
