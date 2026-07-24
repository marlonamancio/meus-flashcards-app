'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

// Must start at 'light' unconditionally so the client's first render (during hydration)
// matches the server-rendered HTML — reading localStorage/data-theme here instead would make
// that first render diverge from SSR whenever the real theme is 'dark', causing a hydration
// mismatch. The real theme (already applied to <html> by the blocking script in
// app/layout.tsx, before paint) is picked up below in an effect, which runs after hydration
// completes and is a normal client-only update, not a mismatch.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const current = document.documentElement.getAttribute('data-theme') as Theme | null
    const initial = stored ?? current ?? 'light'
    // Syncing a browser-only value (localStorage/DOM) into state once on mount — the
    // SSR-safe exception to this rule, not the cascading-render pattern it guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial !== 'light') setTheme(initial)
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return { theme, toggleTheme }
}
