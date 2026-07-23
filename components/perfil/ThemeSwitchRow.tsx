'use client'

import { useTheme } from '@/hooks/useTheme'

export function ThemeSwitchRow() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className="flex items-center justify-between rounded-2xl"
      style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <span className="text-sm font-semibold">Tema escuro</span>
      <button
        onClick={toggleTheme}
        aria-label="Alternar tema escuro"
        aria-pressed={isDark}
        className="flex rounded-full"
        style={{
          width: 46,
          height: 27,
          padding: 3,
          background: isDark ? 'var(--accent)' : 'var(--surface-2)',
          justifyContent: isDark ? 'flex-end' : 'flex-start',
          transition: '.18s',
        }}
        suppressHydrationWarning
      >
        <span
          className="rounded-full block"
          style={{ width: 21, height: 21, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }}
        />
      </button>
    </div>
  )
}
