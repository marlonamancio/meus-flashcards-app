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

// Deterministic per-collection color, purely a function of the collection's own id — the same
// collection always gets the same avatar color everywhere (Home list, Coleções list, detail
// page, Estudar, Navegar), without needing to fetch every other collection just to compute a
// position in some ORDER BY. Replaces the old "index in an ORDER BY criado_em list" scheme,
// which also meant a child collection could get a different color depending on whether it was
// rendered via the flat collections list (position among ALL of the user's collections) or via
// its mãe's own "Subcoleções" section (position among just its siblings) — a hash of the id has
// no such ambiguity, there's only one list-independent answer.
export function paletteForCollectionId(id: string): (typeof COLLECTION_PALETTE)[number] {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return COLLECTION_PALETTE[Math.abs(hash) % COLLECTION_PALETTE.length]
}

export function initials(nome: string): string {
  const words = nome.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
