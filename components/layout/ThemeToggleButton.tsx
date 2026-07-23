'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className="flex items-center justify-center rounded-full flex-none cursor-pointer"
      style={{
        width: 42,
        height: 42,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
      }}
      suppressHydrationWarning
    >
      {theme === 'dark' ? <Sun size={20} strokeWidth={1.9} /> : <Moon size={20} strokeWidth={1.9} />}
    </button>
  )
}
