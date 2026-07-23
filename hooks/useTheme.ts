'use client'

import { useState } from 'react'

type Theme = 'light' | 'dark'

// SSR has no localStorage/DOM, so this defaults to 'light' server-side — matching the
// server-rendered HTML. On the client it reads the value the blocking script in
// app/layout.tsx already applied to <html> before hydration ran. When that value is
// 'dark', it legitimately differs from the SSR default; components that render based
// on `theme` should use suppressHydrationWarning to avoid a false-positive mismatch.
function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  const stored = localStorage.getItem('theme') as Theme | null
  const current = document.documentElement.getAttribute('data-theme') as Theme | null
  return stored ?? current ?? 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return { theme, toggleTheme }
}
