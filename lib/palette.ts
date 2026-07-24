// No server-only imports here on purpose — this module is imported directly by client
// components (avatar color picker) as well as server-side data functions (collection avatars).
// Anything with a next/headers-dependent import chain can't be pulled into a client bundle.

export const COLLECTION_PALETTE = [
  { key: 'amber', color: 'var(--accent-strong)', soft: 'var(--accent-soft)' },
  { key: 'teal', color: 'var(--good)', soft: 'var(--good-soft)' },
  { key: 'blue', color: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
  { key: 'pink', color: '#db2777', soft: 'rgba(219,39,119,.14)' },
] as const

export type AvatarColorKey = (typeof COLLECTION_PALETTE)[number]['key']

export type AvatarPalette = { color: string; soft: string }

const DEFAULT_AVATAR_PALETTE: AvatarPalette = { color: COLLECTION_PALETTE[0].color, soft: COLLECTION_PALETTE[0].soft }

export function isAvatarColorKey(value: string | null | undefined): value is AvatarColorKey {
  return COLLECTION_PALETTE.some((p) => p.key === value)
}

export function getAvatarPalette(key: string | null | undefined): AvatarPalette {
  return COLLECTION_PALETTE.find((p) => p.key === key) ?? DEFAULT_AVATAR_PALETTE
}

export function initials(nome: string): string {
  const words = nome.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
