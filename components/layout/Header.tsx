import type { ReactNode } from 'react'
import Link from 'next/link'
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton'
import type { AvatarPalette } from '@/lib/palette'

const DEFAULT_PALETTE: AvatarPalette = { color: 'var(--accent-strong)', soft: 'var(--accent-soft)' }

export function Header({
  displayName,
  avatarPalette,
  avatarHref,
  children,
}: {
  displayName: string | null
  avatarPalette?: AvatarPalette
  avatarHref?: string
  children: ReactNode
}) {
  const initial = (displayName ?? 'U').charAt(0).toUpperCase()
  const palette = avatarPalette ?? DEFAULT_PALETTE

  const avatarStyle = {
    width: 42,
    height: 42,
    background: palette.soft,
    color: palette.color,
  }

  return (
    <div className="flex justify-between items-center" style={{ padding: '8px 0 4px' }}>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex items-center gap-2.5 flex-none">
        <ThemeToggleButton />
        {avatarHref ? (
          <Link
            href={avatarHref}
            aria-label="Ir para o perfil"
            className="flex items-center justify-center rounded-full flex-none text-[16px] font-bold"
            style={avatarStyle}
          >
            {initial}
          </Link>
        ) : (
          <div className="flex items-center justify-center rounded-full flex-none text-[16px] font-bold" style={avatarStyle}>
            {initial}
          </div>
        )}
      </div>
    </div>
  )
}
